import ExpiryMap from 'expiry-map'
import { v4 as uuidv4 } from 'uuid'
import Browser from 'webextension-polyfill'
import { fetchSSE } from '../fetch-sse'
import { GenerateAnswerParams, Provider } from '../types'

async function request(token: string, method: string, path: string, data?: unknown) {
  return fetch(`https://chat.openai.com/backend-api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
}

export async function sendMessageFeedback(token: string, data: unknown) {
  await request(token, 'POST', '/conversation/message_feedback', data)
}

export async function setConversationProperty(
  token: string,
  conversationId: string,
  propertyObject: object,
) {
  await request(token, 'PATCH', `/conversation/${conversationId}`, propertyObject)
}

const KEY_ACCESS_TOKEN = 'accessToken'

const cache = new ExpiryMap(10 * 1000)

const tabIdConversationIdMap = new Map()
const windowIdConversationIdMap = new Map()

export async function getChatGPTAccessToken(): Promise<string> {
  if (cache.get(KEY_ACCESS_TOKEN)) {
    return cache.get(KEY_ACCESS_TOKEN)
  }
  const resp = await fetch('https://chat.openai.com/api/auth/session')
  if (resp.status === 403) {
    throw new Error('CLOUDFLARE')
  }
  const data = await resp.json().catch(() => ({}))
  if (!data.accessToken) {
    throw new Error('UNAUTHORIZED')
  }
  cache.set(KEY_ACCESS_TOKEN, data.accessToken)
  return data.accessToken
}

export class ChatGPTProvider implements Provider {
  constructor(private token: string) {
    this.token = token
    Browser.tabs.onRemoved.addListener(function (tabid, removed) {
      console.log('tab closed', tabid, removed)
      const delConversationId = tabIdConversationIdMap.get(tabid)
      console.log('delete conversation', delConversationId)
      if (delConversationId) {
        console.log('deleting conversation', delConversationId, 'token=', token)
        try {
          setConversationProperty(token, delConversationId, { is_visible: false })
        } catch (e) {
          console.error(e)
        } finally {
          tabIdConversationIdMap.delete(tabid)
          console.log('deleted conversation', delConversationId)
        }
      }
    })

    Browser.windows.onRemoved.addListener(function (windowid) {
      console.log('window closed', windowid)
      let delConversationIdsConcatinated = windowIdConversationIdMap.get(windowid)
      console.log('delete delConversationIdsConcatinated', delConversationIdsConcatinated)
      if (delConversationIdsConcatinated) {
        const delConversationIdsArray = delConversationIdsConcatinated.split(',')
        for (let i = 0; i < delConversationIdsArray.length; i++) {
          console.log('deleting conversation', delConversationIdsArray[i], 'token=', token)
          try {
            setConversationProperty(token, delConversationIdsArray[i], { is_visible: false })
          } catch (e) {
            console.error(e)
          } finally {
            delConversationIdsConcatinated = delConversationIdsConcatinated.replace(
              delConversationIdsArray[i],
              '',
            )
            delConversationIdsConcatinated = delConversationIdsConcatinated.replace(',,', ',')
            windowIdConversationIdMap.set(windowid, delConversationIdsConcatinated)
            console.log('deleted conversation:', delConversationIdsArray[i])
          }
        }
      }
      if (
        windowIdConversationIdMap.get(windowid) == '' ||
        windowIdConversationIdMap.get(windowid) == ','
      ) {
        windowIdConversationIdMap.delete(windowid)
        console.log('deleted all conversations:', delConversationIdsArray)
      }
      tabIdConversationIdMap.forEach((ConversationId, tabId, map) => {
        console.log('Looking for', ConversationId, tabId, 'in', map)
        // map.set(tabId, ConversationId + "A")
        Browser.tabs.query({ id: tabId }).then(async (tab) => {
          console.log('still open tab:', tab)
        })
      })
    })
  }

  private async fetchModels(): Promise<
    { slug: string; title: string; description: string; max_tokens: number }[]
  > {
    const resp = await request(this.token, 'GET', '/models').then((r) => r.json())
    return resp.models
  }

  private async getModelName(): Promise<string> {
    try {
      const models = await this.fetchModels()
      return models[0].slug
    } catch (err) {
      console.error(err)
      return 'text-davinci-002-render'
    }
  }

  async generateAnswer(params: GenerateAnswerParams) {
    let conversationId: string | undefined

    const cleanup = () => {
      if (conversationId) {
        setConversationProperty(this.token, conversationId, { is_visible: false })
      }
    }

    const modelName = await this.getModelName()
    console.log('Using model:', modelName, 'params:', params)

    const callfetchSSE = async (conversationId: string, with_conversation_id: bool) => {
      await fetchSSE('https://chat.openai.com/backend-api/conversation', {
        method: 'POST',
        signal: params.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          action: 'next',
          messages: [
            {
              id: uuidv4(),
              role: 'user',
              content: {
                content_type: 'text',
                parts: [params.prompt],
              },
            },
          ],
          model: modelName,
          parent_message_id: params.parentMessageId || uuidv4(),
          conversation_id: with_conversation_id ? params.conversationId : undefined,
        }),
        onMessage(message: string) {
          console.debug('sse message', message)
          if (message === '[DONE]') {
            params.onEvent({ type: 'done' })
            return
          }
          let data
          try {
            data = JSON.parse(message)
          } catch (err) {
            console.error(err)
            return
          }
          console.debug('sse message.message', data.message)
          console.log('sse message.conversation_id:', data.conversation_id)
          const text = data.message?.content?.parts?.[0] + '✏'
          if (text) {
            // Browser.storage.local.set({ conversationId: data.conversation_id })
            // Browser.storage.local.set({ messageId: data.message.id })
            if (data.message.author.role == 'assistant') {
              conversationId = data.conversation_id
              params.onEvent({
                type: 'answer',
                data: {
                  text,
                  messageId: data.message.id,
                  conversationId: data.conversation_id,
                  parentMessageId: data.parent_message_id,
                },
              })
            }

            const countWords = (text) => {
              return text.trim().split(/\s+/).length
            }
            if (0 < countWords(text) && countWords(text) < 5) {
              Browser.tabs.query({}).then(async (tabs) => {
                console.log('tabs:', tabs)
                for (let i = 0; i < tabs.length; i++) {
                  if (tabs[i].active == true && !tabIdConversationIdMap.get(tabs[i].id)) {
                    tabIdConversationIdMap.set(tabs[i].id, data.conversation_id)
                  }
                }
                console.log('tabIdConversationIdMap:', tabIdConversationIdMap)
              })

              Browser.windows.getAll({}).then(async (windows) => {
                console.log('windows:', windows)
                for (let i = 0; i < windows.length; i++) {
                  if (windows[i].focused == true) {
                    const alreadyConversationIdsInWindow = windowIdConversationIdMap.get(
                      windows[i].id,
                    )
                    if (alreadyConversationIdsInWindow) {
                      if (alreadyConversationIdsInWindow.indexOf(data.conversation_id) == -1)
                        windowIdConversationIdMap.set(
                          windows[i].id,
                          alreadyConversationIdsInWindow + ',' + data.conversation_id,
                        )
                    } else {
                      windowIdConversationIdMap.set(windows[i].id, data.conversation_id)
                    }
                  }
                }
                console.log('windowIdConversationIdMap:', windowIdConversationIdMap)
              })
            }
          }
        },
      })
    }

    let retry_due_to_conversation_not_found: bool = false
    try {
      callfetchSSE(conversationId, true)
    } catch (e) {
      console.error(e.message)
      if (e.message.indexOf('conversation_not_found') !== -1) {
        retry_due_to_conversation_not_found = true
        console.log('Lets retry_due_to_conversation_not_found')
      }
      if (retry_due_to_conversation_not_found) {
        try {
          cleanup()
          callfetchSSE(conversationId, false)
          retry_due_to_conversation_not_found = false
        } catch (e) {
          console.error(e.message)
          if (e.message.indexOf('conversation_not_found') !== -1) {
            retry_due_to_conversation_not_found = true
            console.log('Its still conversation_not_found')
          }
        }
      }
    }
    return { cleanup }
  }
}
