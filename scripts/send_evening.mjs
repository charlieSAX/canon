// Send the evening letter composed by scripts/evening_email.mjs.
//
// Credentials come from the environment and are never printed. The recipient is
// deliberately a repository variable rather than a constant, so changing who
// receives this needs no code change.
//
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   the mailbox that sends
//   EVENING_TO                                    the recipient
//   EVENING_FROM                                  optional, defaults to SMTP_USER
//
//   node scripts/send_evening.mjs <dir>          send what is in that directory
//   node scripts/send_evening.mjs <dir> --dry    connect, verify, send nothing
import { readFileSync, existsSync } from 'node:fs'
import nodemailer from 'nodemailer'

const dir = process.argv[2]
const dry = process.argv.includes('--dry')
if (!dir || !existsSync(`${dir}/body.html`)) {
  console.error('usage: node scripts/send_evening.mjs <dir built by evening_email.mjs> [--dry]')
  process.exit(1)
}

// --build assembles the real message through nodemailer and prints what came
// out, without a server or a credential. It is how the letter gets checked.
const build = process.argv.includes('--build')

const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EVENING_TO']
const missing = required.filter((key) => !process.env[key])
if (missing.length > 0 && !build) {
  console.error(`send: missing ${missing.join(', ')}. Nothing sent.`)
  process.exit(1)
}

const subject = readFileSync(`${dir}/subject.txt`, 'utf8').trim()
const html = readFileSync(`${dir}/body.html`, 'utf8')
const text = readFileSync(`${dir}/body.txt`, 'utf8')
const hasDetail = existsSync(`${dir}/detail.jpg`) && readFileSync(`${dir}/detail.flag`, 'utf8').trim() === '1'

const port = Number(process.env.SMTP_PORT ?? 465)
const transport = build
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })

if (!build) {
  await transport.verify()
  console.log(`send: connected to ${process.env.SMTP_HOST}:${port}`)
}

if (dry) {
  console.log(`send: dry run, nothing dispatched. Subject would be "${subject}".`)
  process.exit(0)
}

const info = await transport.sendMail({
  from: process.env.EVENING_FROM || process.env.SMTP_USER || 'canon@example.invalid',
  to: process.env.EVENING_TO || 'someone@example.invalid',
  subject,
  text,
  html,
  attachments: hasDetail
    ? [{ filename: 'detail.jpg', path: `${dir}/detail.jpg`, cid: 'detail' }]
    : []
})

if (build) {
  const message = JSON.parse(info.message)
  console.log(`build: subject "${message.subject}"`)
  console.log(`build: html ${message.html.length} bytes, text ${message.text.length} bytes`)
  console.log(`build: attachments ${message.attachments?.length ?? 0}`)
  for (const a of message.attachments ?? []) console.log(`build:   ${a.filename} cid=${a.cid}`)
  console.log(`build: html references cid:detail: ${message.html.includes('cid:detail')}`)
  process.exit(0)
}

// Log the outcome without echoing the recipient in full.
const [name, domain] = String(process.env.EVENING_TO).split('@')
console.log(`send: delivered ${info.messageId} to ${name.slice(0, 2)}...@${domain}`)
