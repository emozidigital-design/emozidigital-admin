/**
 * One-time setup script: creates the SNS topic, subscribes the webhook,
 * and wires up the SES configuration set event destination.
 *
 * Run with:
 *   node --env-file=.env.local scripts/setup-ses-sns.mjs
 */

import { SNSClient, CreateTopicCommand, SubscribeCommand } from "@aws-sdk/client-sns"
import {
  SESClient,
  CreateConfigurationSetCommand,
  CreateConfigurationSetEventDestinationCommand,
} from "@aws-sdk/client-ses"

const region = process.env.AWS_REGION
const webhookUrl = process.env.NEXTAUTH_URL

if (!process.env.AWS_ACCESS_KEY_ID?.trim() || !process.env.AWS_SECRET_ACCESS_KEY?.trim()) {
  console.error("❌  AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in .env.local")
  process.exit(1)
}
if (!webhookUrl) {
  console.error("❌  NEXTAUTH_URL must be set in .env.local (used as the SNS endpoint base)")
  process.exit(1)
}

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
}

const sns = new SNSClient({ region, credentials })
const ses = new SESClient({ region, credentials })

const TOPIC_NAME = "emozi-ses-feedback"
const CONFIG_SET = "emozi-default"
const ENDPOINT = `${webhookUrl.replace(/\/$/, "")}/api/webhooks/ses`

console.log(`\n🚀  Setting up SES + SNS in region: ${region}`)
console.log(`    Webhook endpoint: ${ENDPOINT}\n`)

// ── 1. Create SNS topic ──────────────────────────────────────────────────────
console.log(`1/4  Creating SNS topic "${TOPIC_NAME}"…`)
const topicRes = await sns.send(new CreateTopicCommand({ Name: TOPIC_NAME }))
const topicArn = topicRes.TopicArn
console.log(`     ✓  TopicArn: ${topicArn}\n`)

// ── 2. Subscribe webhook to the topic ───────────────────────────────────────
console.log(`2/4  Subscribing webhook to topic…`)
const subRes = await sns.send(new SubscribeCommand({
  TopicArn: topicArn,
  Protocol: "https",
  Endpoint: ENDPOINT,
}))
console.log(`     ✓  SubscriptionArn: ${subRes.SubscriptionArn}`)
console.log(`     ℹ  Status will be "PendingConfirmation" until the webhook confirms it.\n`)

// ── 3. Create SES configuration set ─────────────────────────────────────────
console.log(`3/4  Creating SES configuration set "${CONFIG_SET}"…`)
try {
  await ses.send(new CreateConfigurationSetCommand({
    ConfigurationSet: { Name: CONFIG_SET },
  }))
  console.log(`     ✓  Configuration set created.\n`)
} catch (err) {
  if (err?.name === "ConfigurationSetAlreadyExistsException" || err?.Code === "AlreadyExists") {
    console.log(`     ℹ  Configuration set already exists — skipping.\n`)
  } else {
    throw err
  }
}

// ── 4. Attach SNS topic as event destination ─────────────────────────────────
console.log(`4/4  Attaching SNS topic to configuration set for all event types…`)
try {
  await ses.send(new CreateConfigurationSetEventDestinationCommand({
    ConfigurationSetName: CONFIG_SET,
    EventDestination: {
      Name: "sns-feedback",
      Enabled: true,
      MatchingEventTypes: ["send", "reject", "bounce", "complaint", "delivery", "open", "click"],
      SNSDestination: { TopicARN: topicArn },
    },
  }))
  console.log(`     ✓  Event destination "sns-feedback" attached.\n`)
} catch (err) {
  if (err?.name === "EventDestinationAlreadyExistsException") {
    console.log(`     ℹ  Event destination already exists — skipping.\n`)
  } else {
    throw err
  }
}

console.log("✅  Setup complete!\n")
console.log("Next steps:")
console.log("  1. SNS will POST a SubscriptionConfirmation to your webhook immediately.")
console.log("     The webhook auto-confirms it. Check SNS console → Subscriptions to verify.")
console.log("  2. Make sure the admin site is deployed so the webhook URL is reachable by SNS.")
console.log(`     Endpoint: ${ENDPOINT}`)
console.log("  3. Add a verified sender via /email/senders and copy the DKIM DNS records.")
console.log("  4. Request SES production access in the AWS console if still in sandbox mode.\n")
