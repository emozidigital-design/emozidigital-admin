import { SNSClient, ListSubscriptionsByTopicCommand } from "@aws-sdk/client-sns"

const sns = new SNSClient({
  region: process.env.AWS_REGION.trim(),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
  },
})

const res = await sns.send(new ListSubscriptionsByTopicCommand({
  TopicArn: "arn:aws:sns:ap-south-1:841291679210:emozi-ses-feedback"
}))

for (const sub of res.Subscriptions ?? []) {
  const confirmed = sub.SubscriptionArn !== "PendingConfirmation"
  console.log(`Endpoint : ${sub.Endpoint}`)
  console.log(`Status   : ${confirmed ? "✅  Confirmed" : "⏳  PendingConfirmation"}`)
  if (confirmed) console.log(`ARN      : ${sub.SubscriptionArn}`)
}
