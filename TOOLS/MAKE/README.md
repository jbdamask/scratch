# Make.com pipelines
This folder contains make.com templates of scenarios I made. Import these into your account, change what needs to be changed, and run them yourself.

## Newsletter Digests
Creates executive summaries of all new blog posts in my Inbox and posts them to a Newletters channel in my Slack workspace. Set to run every day at 6am.

Prerequisites:
Blog subscriptions being sent to a GMail account. Automatic labelling of new posts as "Newsletter UNREAD". Slack workspace. OpenAI API key.

Config:
1. Create a Gmail filter that automatically labels emails you want included with newsletter-unread
2. Create a channel called newsletters in your Slack space
3. Create a new Slack app at https://api.slack.com/apps 
4. Follow one of a hundred tutorials for how to connect Make.com to your Gmail and Slack accounts
5. Import the Newsletter_Digests_to_Slack.json blueprint from this folder into your Make.com account
6. Update Connection details for Gmail, Slack, and OpenAI API
