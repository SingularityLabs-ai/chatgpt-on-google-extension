import { GearIcon } from '@primer/octicons-react'
import { useEffect, useState } from 'preact/hooks'
import { memo, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { toast, Zoom } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import rehypeHighlight from 'rehype-highlight'
import Browser from 'webextension-polyfill'
import { captureEvent } from '../analytics'
import { Answer } from '../messaging'
import { extract_followups, extract_followups_section } from '../utils/parse'
import ChatGPTFeedback from './ChatGPTFeedback'
import { isBraveBrowser, shouldShowRatingTip } from './utils.js'

export type QueryStatus = 'success' | 'error' | undefined

interface Props {
  question: string
  onStatusChange?: (status: QueryStatus) => void
}

interface Requestion {
  requestion: string
  index: number
  answer: Answer | null
}

interface ReQuestionAnswerProps {
  latestAnswerText: string | undefined
}

function ChatGPTQuery(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [done, setDone] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const [status, setStatus] = useState<QueryStatus>()
  const [reError, setReError] = useState('')
  const [reQuestionDone, setReQuestionDone] = useState(false)
  const [requestionList, setRequestionList] = useState<Requestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [reQuestionLatestAnswerText, setReQuestionLatestAnswerText] = useState<string | undefined>()

  useEffect(() => {
    props.onStatusChange?.(status)
  }, [props, status])

  useEffect(() => {
    const port = Browser.runtime.connect()
    const listener = (msg: any) => {
      console.log('frontend msg:', msg)
      try {
        if (msg.text) {
          setAnswer(msg)
          setStatus('success')
        } else if (msg.error) {
          console.log('frontend msg.error:', msg.error)
          setError(msg.error)
          setStatus('error')
          toast.error(msg.error, { position: 'bottom-right', transition: Zoom })
        } else if (msg.event === 'DONE') {
          setDone(true)
          setReQuestionDone(true)
        }
      } catch (e) {
        console.log(e)
      }
    }
    port.onMessage.addListener(listener)
    port.postMessage({ question: props.question })
    return () => {
      port.onMessage.removeListener(listener)
      port.disconnect()
    }
  }, [props.question, retry])

  // retry error on focus
  useEffect(() => {
    const onFocus = () => {
      if (error && (error == 'UNAUTHORIZED' || error === 'CLOUDFLARE')) {
        setError('')
        setRetry((r) => r + 1)
      }
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [error])

  useEffect(() => {
    shouldShowRatingTip().then((show) => setShowTip(show))
  }, [])

  useEffect(() => {
    if (status === 'success') {
      captureEvent('show_answer', { host: location.host, language: navigator.language })
    }
  }, [props.question, status])

  const openOptionsPage = useCallback(() => {
    Browser.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' })
  }, [])

  // requestion
  useEffect(() => {
    if (!requestionList[questionIndex]) return
    const port = Browser.runtime.connect()
    const listener = (msg: any) => {
      try {
        if (msg.text) {
          const requestionListValue = requestionList
          requestionListValue[questionIndex].answer = msg
          setRequestionList(requestionListValue)
          const latestAnswerText = requestionList[questionIndex]?.answer?.text
          setReQuestionLatestAnswerText(latestAnswerText)
        } else if (msg.error) {
          setReError(msg.error)
          toast.error(msg.error, { position: 'bottom-right', transition: Zoom })
        } else if (msg.event === 'DONE') {
          setReQuestionDone(true)
          setQuestionIndex(questionIndex + 1)
        }
      } catch (e) {
        console.log(e)
      }
    }
    port.onMessage.addListener(listener)
    port.postMessage({
      question: requestionList[questionIndex].requestion,
      conversationId: answer?.conversationId,
      parentMessageId:
        questionIndex == 0
          ? answer?.messageId
          : requestionList[questionIndex - 1].answer?.messageId,
      // conversationContext:
      //   questionIndex == 0
      //     ? answer?.conversationContext
      //     : requestionList[questionIndex - 1].answer?.conversationContext,
    })
    return () => {
      port.onMessage.removeListener(listener)
      port.disconnect()
    }
  }, [
    requestionList,
    questionIndex,
    answer?.conversationId,
    answer?.messageId,
    // answer?.conversationContext,
  ])

  // * Requery Handler Function
  const requeryHandler = useCallback(() => {
    if (inputRef.current) {
      setReQuestionDone(false)
      const requestion = inputRef.current.value
      setRequestionList([...requestionList, { requestion, index: questionIndex, answer: null }])
      inputRef.current.value = ''
    }
  }, [requestionList, questionIndex])

  const FollowupQuestionFixed = ({
    followup_question,
  }: {
    followup_question: string | undefined
  }) => {
    const clickCopyToInput = useCallback(async () => {
      if (reQuestionDone) {
        inputRef.current.value = followup_question
        setTimeout(() => {
          requeryHandler()
        }, 500)
      } else {
        const warnMsg = 'Wait untill the earlier prompt completes'
        console.log(warnMsg + '..')
        toast.warn(warnMsg, { position: 'bottom-right', transition: Zoom })
      }
    }, [followup_question])

    return (
      <div className="followup-question-container" onClick={clickCopyToInput}>
        <ReactMarkdown rehypePlugins={[[rehypeHighlight, { detect: true }]]}>
          {followup_question}
        </ReactMarkdown>
      </div>
    )
  }

  const ReQuestionAnswerFixed = ({ text }: { text: string | undefined }) => {
    if (!text) return <p className="text-[#b6b8ba] animate-pulse">Answering...</p>
    return (
      <ReactMarkdown rehypePlugins={[[rehypeHighlight, { detect: true }]]}>{text}</ReactMarkdown>
    )
  }

  const ReQuestionAnswer = ({ latestAnswerText }: ReQuestionAnswerProps) => {
    if (!latestAnswerText || requestionList[requestionList.length - 1]?.answer?.text == undefined) {
      return <p className="text-[#b6b8ba] animate-pulse">Answering...</p>
    }
    return (
      <ReactMarkdown rehypePlugins={[[rehypeHighlight, { detect: true }]]}>
        {latestAnswerText}
      </ReactMarkdown>
    )
  }

  if (answer) {
    console.log('answer.text', answer.text)
    const followup_section = extract_followups_section(answer.text)
    const final_followups = extract_followups(followup_section)

    return (
      <div className="markdown-body gpt-markdown" id="gpt-answer" dir="auto">
        <div className="gpt-header">
          <span className="font-bold">GoogleGPT</span>
          <span className="cursor-pointer leading-[0]" onClick={openOptionsPage}>
            <GearIcon size={14} />
          </span>
          <ChatGPTFeedback
            messageId={answer.messageId}
            conversationId={answer.conversationId}
            latestAnswerText={answer.text}
          />
        </div>
        <ReactMarkdown rehypePlugins={[[rehypeHighlight, { detect: true }]]}>
          {answer.text.replace(followup_section, '')}
        </ReactMarkdown>
        <div className="all-questions-container">
          {final_followups.map((followup_question, index) => (
            <div className="ith-question-container" key={index}>
              {<FollowupQuestionFixed followup_question={followup_question} />}
            </div>
          ))}
        </div>

        <div className="question-container">
          {requestionList.map((requestion) => (
            <div key={requestion.index}>
              <div className="font-bold">{`Q${requestion.index + 1} : ${
                requestion.requestion
              }`}</div>
              {reError ? (
                <p>
                  Failed to load response from ChatGPT:
                  <span className="break-all block">{reError}</span>
                </p>
              ) : requestion.index < requestionList.length - 1 ? (
                <ReQuestionAnswerFixed text={requestion.answer?.text} />
              ) : (
                <ReQuestionAnswer latestAnswerText={reQuestionLatestAnswerText} />
              )}
            </div>
          ))}
        </div>

        {done && (
          <form
            id="requestion"
            style={{ display: 'flex' }}
            onSubmit={(e) => {
              // submit when press enter key
              e.preventDefault()
            }}
          >
            <input
              disabled={!reQuestionDone}
              type="text"
              ref={inputRef}
              placeholder="Tell Me More"
              id="question"
            />
            <button id="submit" onClick={requeryHandler}>
              ASK
            </button>
            <p> Used for mins . showTip shown {showTip} times </p>
          </form>
        )}
      </div>
    )
  }

  if (error === 'UNAUTHORIZED' || error === 'CLOUDFLARE') {
    return (
      <p>
        Please login and pass Cloudflare check at{' '}
        <a href="https://chat.openai.com" target="_blank" rel="noreferrer">
          chat.openai.com
        </a>
        {retry > 0 &&
          (() => {
            if (isBraveBrowser()) {
              return (
                <span className="block mt-2">
                  Still not working? Follow{' '}
                  <a href="https://github.com/ishandutta2007/bard-google-extension#troubleshooting">
                    Brave Troubleshooting
                  </a>
                </span>
              )
            } else {
              return (
                <span className="italic block mt-2 text-xs">
                  OpenAI requires passing a security check every once in a while. If this keeps
                  happening, change AI provider to OpenAI API in the extension options.
                </span>
              )
            }
          })()}
      </p>
    )
  }
  if (error) {
    return (
      <p>
        Failed to load response from ChatGPT:
        <span className="break-all block">{error}</span>
      </p>
    )
  }

  return <p className="text-[#b6b8ba] animate-pulse">Waiting for ChatGPT...</p>
}

export default memo(ChatGPTQuery)
