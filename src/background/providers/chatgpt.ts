// import { Buffer } from 'buffer'
// import dayjs from 'dayjs'
// import { createParser } from 'eventsource-parser'
// import ExpiryMap from 'expiry-map'
// import { v4 as uuidv4 } from 'uuid'
// import Browser from 'webextension-polyfill'
// import WebSocketAsPromised from 'websocket-as-promised'
// import { parseSSEResponse, parseSSEResponse3 } from '~utils/sse'
// import { ADAY, APPSHORTNAME, HALFHOUR } from '../../utils/consts'
// import { fetchSSE } from '../fetch-sse'
// import { GenerateAnswerParams, Provider } from '../types'
// dayjs().format()

// async function request(token: string, method: string, path: string, data?: unknown) {
//   return fetch(`https://chatgpt.com/backend-api${path}`, {
//     method,
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${token}`,
//     },
//     body: data === undefined ? undefined : JSON.stringify(data),
//   })
// }

// async function request_new(
//   token: string,
//   method: string,
//   path: string,
//   data?: unknown,
//   callback?: unknown,
// ) {
//   return fetch(`https://chatgpt.com/backend-api${path}`, {
//     method,
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${token}`,
//     },
//     body: data === undefined ? undefined : JSON.stringify(data),
//   })
//     .then(function (response) {
//       console.log('fetch', token != null, method, path, 'response', response)
//       return response.json()
//     })
//     .then(function (data) {
//       console.log('response data', data)
//       if (callback) callback(token, data)
//     })
//     .catch((error) => {
//       console.error('fetch', token, method, path, 'error', error)
//     })
// }

// export async function sendMessageFeedback(token: string, data: unknown) {
//   await request(token, 'POST', '/conversation/message_feedback', data)
// }

// export async function setConversationProperty(
//   token: string,
//   conversationId: string,
//   propertyObject: object,
// ) {
//   await request(token, 'PATCH', `/conversation/${conversationId}`, propertyObject)
// }

// const browsertabIdConversationIdMap = new Map()
// const windowIdConversationIdMap = new Map()

// function deleteRecentConversations(token, data) {
//   const now = dayjs()
//   const startTime = dayjs(performance.timeOrigin)
//   console.log('startTime', startTime)
//   const convs = data.items
//   console.log('convs', convs)
//   for (let i = 0; i < convs.length; i++) {
//     const conv_i_time = dayjs(convs[i].create_time)
//     console.log(
//       'conv' + i,
//       convs[i].id,
//       conv_i_time,
//       conv_i_time - startTime,
//       now - conv_i_time,
//       now - conv_i_time < ADAY,
//     )
//     if (
//       HALFHOUR < now - conv_i_time &&
//       now - conv_i_time < ADAY &&
//       convs[i].title.indexOf(APPSHORTNAME + ':') != -1
//     ) {
//       setTimeout(function () {
//         console.log('Deleting', token != null, convs[i].id)
//         setConversationProperty(token, convs[i].id, { is_visible: false })
//         const cloneBTCMap = new Map(browsertabIdConversationIdMap)
//         cloneBTCMap.forEach((ConversationId, tabId, map) => {
//           console.log('Looking for', ConversationId, tabId, 'in', map)
//           if (ConversationId == convs[i].id) {
//             console.log('Deleting ', ConversationId, tabId, 'from', map)
//             browsertabIdConversationIdMap.delete(tabid)
//             console.log(
//               'browsertabIdConversationIdMap after Deleting ',
//               browsertabIdConversationIdMap,
//             )
//           }
//         })
//         const cloneWCMap = new Map(windowIdConversationIdMap)
//         cloneWCMap.forEach((conversationIdsConcatinated, windowId, map) => {
//           console.log('Looking for', conversationIdsConcatinated, windowId, 'in', map)
//           if (conversationIdsConcatinated.indexOf(convs[i].id) != -1) {
//             console.log('Deleting ', convs[i].id, windowId, 'from', map)
//             conversationIdsConcatinated = conversationIdsConcatinated.replace(convs[i].id, '')
//             conversationIdsConcatinated = conversationIdsConcatinated.replace(',,', ',')
//             windowIdConversationIdMap.set(windowid, conversationIdsConcatinated)
//             console.log('windowIdConversationIdMap after Deleting ', windowIdConversationIdMap)
//           }
//         })
//       }, i * 1000)
//     }
//   }
// }

// const KEY_ACCESS_TOKEN = 'accessToken'

// const cache = new ExpiryMap(10 * 1000)

// export async function getChatGPTAccessToken(): Promise<string> {
//   if (cache.get(KEY_ACCESS_TOKEN)) {
//     return cache.get(KEY_ACCESS_TOKEN)
//   }
//   const resp = await fetch('https://chatgpt.com/api/auth/session')
//   if (resp.status === 403) {
//     throw new Error('CLOUDFLARE')
//   }
//   const data = await resp.json().catch(() => ({}))
//   if (!data.accessToken) {
//     throw new Error('UNAUTHORIZED')
//   }
//   cache.set(KEY_ACCESS_TOKEN, data.accessToken)
//   return data.accessToken
// }
// export async function setChatgptwssIsOpenFlag(isOpen: boolean) {
//   const { chatgptwssIsOpenFlag = false } = await Browser.storage.sync.get('chatgptwssIsOpenFlag')
//   Browser.storage.sync.set({ chatgptwssIsOpenFlag: isOpen })
//   return chatgptwssIsOpenFlag
// }

// export function countWords(text: string) {
//   return text.trim().split(/\s+/).length
// }

// export class ChatGPTProvider implements Provider {
//   constructor(private token: string) {
//     this.token = token
//     //Brute:
//     request_new(
//       token,
//       'GET',
//       '/conversations?offset=0&limit=100&order=updated',
//       undefined,
//       deleteRecentConversations,
//     )
//   }

//   private async fetchModels(): Promise<
//     { slug: string; title: string; description: string; max_tokens: number }[]
//   > {
//     const resp = await request(this.token, 'GET', '/models').then((r) => r.json())
//     return resp.models
//   }

//   private async getModelName(): Promise<string> {
//     try {
//       const models = await this.fetchModels()
//       return models[0].slug
//     } catch (err) {
//       console.error(err)
//       return 'text-davinci-002-render'
//     }
//   }

//   async getChatRequirementsToken(params: SendMessageParams) {
//     const resp = await fetch('https://chatgpt.com/backend-api/sentinel/chat-requirements', {
//       method: 'POST',
//       signal: params.signal,
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${this.token}`,
//         conversation_mode_kind: 'primary_assistant',
//       },
//       body: JSON.stringify({
//         conversation_mode_kind: 'primary_assistant',
//       }),
//     })
//     console.log('getChatRequirements:resp:', resp)
//     let retToken = ''
//     await parseSSEResponse3(resp, (message: any) => {
//       console.log('getChatRequirements:message:', message)
//       retToken = message.token
//     })
//     console.log('retToken:', retToken)
//     return retToken
//   }

//   async registerWSS(params: GenerateAnswerParams) {
//     const resp = await fetch('https://chatgpt.com/backend-api/register-websocket', {
//       method: 'POST',
//       signal: params.signal,
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${this.token}`,
//       },
//       body: void 0,
//     })
//     return resp
//   }

//   async setupWSS(params: GenerateAnswerParams, regResp: any) {
//     console.log('ChatGPTProvider:setupWSS:regResp', regResp)
//     let jj
//     await parseSSEResponse(regResp, (message) => {
//       console.log('ChatGPTProvider:setupWSS:parseSSEResponse:message', message)
//       jj = JSON.parse(message)
//     })
//     console.log('ChatGPTProvider:jj', jj)
//     if (jj) {
//       const wsAddress = jj['wss_url']
//       const wsp: WebSocketAsPromised = new WebSocketAsPromised(wsAddress, {
//         createWebSocket: (url) => {
//           const ws = new WebSocket(wsAddress, [
//             'Sec-Websocket-Protocol',
//             'json.reliable.webpubsub.azure.v1',
//           ])
//           ws.binaryType = 'arraybuffer'
//           return ws
//         },
//       })
//       console.log('ChatGPTProvider:setupWebsocket:wsp', wsp)

//       const openListener = async () => {
//         console.log('ChatGPTProvider:setupWSSopenListener::wsp.onOpen')
//         await setChatgptwssIsOpenFlag(true)
//       }

//       let next_check_seqid = Math.round(Math.random() * 50)
//       let lastSendTextLen = 0
//       const messageListener = (message: any) => {
//         // console.log('ChatGPTProvider:setupWebsocket:wsp.onMessage:', message)
//         const jjws = JSON.parse(message)
//         console.log('ChatGPTProvider:setupWSS:messageListener:jjws:', jjws)
//         const rawMessage = jjws['data'] ? jjws['data']['body'] : ''
//         console.log('ChatGPTProvider:setupWSS:wsp.onMessage:rawMessage:', rawMessage)
//         const b64decodedMessage = Buffer.from(rawMessage, 'base64')
//         const finalMessageStr = b64decodedMessage.toString()
//         console.log('ChatGPTProvider:setupWebsocket:wsp.onMessage:finalMessage:', finalMessageStr)

//         const parser = createParser((parent_message) => {
//           console.log('ChatGPTProvider:setupWSS:createParser:parent_message', parent_message) //event=`{data:'{}',event:undefine,id=undefined,type='event'}`
//           let data
//           try {
//             if ((parent_message['data' as keyof typeof parent_message] as string) === '[DONE]') {
//               console.log('ChatGPTProvider:setupWSS:createParser:returning DONE to frontend2')
//               params.onEvent({ type: 'done' })
//               wsp.close()
//               return
//             } else if (parent_message['data' as keyof typeof parent_message]) {
//               data = JSON.parse(parent_message['data' as keyof typeof parent_message])
//               console.log('ChatGPTProvider:setupWSS:createParser:data', data)
//             }
//           } catch (err) {
//             console.log('ChatGPTProvider:setupWSS:createParser:Error', err)
//             params.onEvent({ type: 'error', message: (err as any)?.message })
//             wsp.close()
//             return
//           }
//           const content = data?.message?.content as ResponseContent | undefined
//           if (!content) {
//             console.log('ChatGPTProvider:returning DONE to frontend3')
//             params.onEvent({ type: 'done' })
//             wsp.close()
//             return
//           }
//           let text: string
//           if (content.content_type === 'text') {
//             text = content.parts[0]
//             // text = removeCitations(text)
//           } else if (content.content_type === 'code') {
//             text = '_' + content.text + '_'
//           } else {
//             console.log('ChatGPTProvider:returning DONE to frontend4')
//             params.onEvent({ type: 'done' })
//             wsp.close()
//             return
//           }
//           if (text) {
//             const nWords = countWords(text)
//             if (nWords >= 1 && data.message?.author?.role == 'assistant') {
//               if (nWords == 1 && params.prompt.indexOf('search query:') !== -1) {
//                 // this.renameConversationTitle(data.conversation_id, params)
//               }
//               console.debug(
//                 'ChatGPTProvider:generateAnswerBySSE:answer:text(setupWSS:messageListener):',
//                 text,
//               )
//               params.onEvent({
//                 type: 'answer',
//                 data: {
//                   text,
//                   messageId: data.message.id,
//                   parentMessageId: data.parent_message_id,
//                   conversationId: data.conversation_id,
//                 },
//               })
//             }
//           }
//         })
//         // if (finalMessageStr.length - lastSendTextLen > 40)
//         parser.feed(finalMessageStr)
//         lastSendTextLen = finalMessageStr.length

//         const sequenceId = jjws['sequenceId']
//         console.log('ChatGPTProvider:doSendMessage:sequenceId:', sequenceId)
//         if (sequenceId === next_check_seqid) {
//           const t = {
//             type: 'sequenceAck',
//             sequenceId: next_check_seqid,
//           }
//           if (wsp.isOpened) {
//             wsp.send(JSON.stringify(t))
//             next_check_seqid += Math.round(Math.random() * 50)
//           } else {
//             console.log('ChatGPTProvider:doSendMessage:WebSocket is not open:wsp, t:', wsp, t)
//           }
//         }
//       }
//       wsp.removeAllListeners()
//       wsp.close()
//       wsp.onOpen.addListener(openListener)
//       wsp.onMessage.addListener(messageListener)
//       wsp.onClose.removeListener(messageListener)
//       wsp.open().catch(async (e) => {
//         console.log('ChatGPTProvider:doSendMessage:open:showError:Error caught while opening ws', e)
//         wsp.removeAllListeners()
//         wsp.close()
//         await setChatgptwssIsOpenFlag(false)
//         params.onEvent({ type: 'error', message: (e as any)?.message })
//       })
//     }
//   }

//   async generateAnswer(params: GenerateAnswerParams) {
//     console.log('chatgpt', params.arkoseToken)
//     let conversationId: string | undefined

//     const countWords = (text) => {
//       return text.trim().split(/\s+/).length
//     }

//     const getConversationTitle = (bigtext: string) => {
//       let ret = bigtext.split('\n', 1)[0]
//       ret = ret.split('.', 1)[0]
//       ret = APPSHORTNAME + ':' + ret.split(':')[1].trim()
//       console.log('getConversationTitle:', ret)
//       return ret
//     }

//     const renameConversationTitle = (convId: string) => {
//       const titl: string = getConversationTitle(params.prompt)
//       console.log('renameConversationTitle:', this.token, convId, titl)
//       setConversationProperty(this.token, convId, { title: titl })
//     }
//     const cleanup = () => {
//       if (conversationId) {
//         // setConversationProperty(this.token, conversationId, { is_visible: false })
//       }
//     }

//     const regResp = await this.registerWSS(params)
//     await this.setupWSS(params, regResp) // Since params change WSS have to be setup up every time

//     const modelName = await this.getModelName()
//     const chatRequirementsToken = await this.getChatRequirementsToken(params)
//     console.debug('Using model:', modelName)

//     await fetchSSE('https://chatgpt.com/backend-api/conversation', {
//       method: 'POST',
//       signal: params.signal,
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${this.token}`,
//         'Openai-Sentinel-Arkose-Token': params.arkoseToken,
//         'Openai-Sentinel-Chat-Requirements-Token': chatRequirementsToken,
//       },
//       body: JSON.stringify({
//         action: 'next',
//         messages: [
//           {
//             id: uuidv4(),
//             role: 'user',
//             content: {
//               content_type: 'text',
//               parts: [params.prompt],
//             },
//           },
//         ],
//         model: modelName,
//         parent_message_id: params.parentMessageId || uuidv4(),
//         conversation_id: params.conversationId,
//         arkose_token: params.arkoseToken,
//         conversation_mode: {
//           kind: 'primary_assistant',
//         },
//         history_and_training_disabled: !1,
//         force_paragen: !1,
//         force_rate_limit: !1,
//         suggestions: [],
//         // websocket_request_id://TODO:still working without it
//       }),
//       onMessage(message: string) {
//         console.debug('sse message', message)
//         if (message === '[DONE]') {
//           params.onEvent({ type: 'done' })
//           cleanup()
//           return
//         }
//         let data
//         try {
//           data = JSON.parse(message)
//         } catch (err) {
//           console.error(err)
//           return
//         }
//         const text = data.message?.content?.parts?.[0]
//         if (text) {
//           if (countWords(text) == 1 && data.message?.author?.role == 'assistant') {
//             if (params.prompt.indexOf('search query:') !== -1) {
//               renameConversationTitle(data.conversation_id)
//             }
//           }
//           conversationId = data.conversation_id
//           params.onEvent({
//             type: 'answer',
//             data: {
//               text,
//               messageId: data.message.id,
//               parentMessageId: data.parent_message_id,
//               conversationId: data.conversation_id,
//             },
//           })
//         }
//       },
//     })
//     return { cleanup }
//   }
// }
