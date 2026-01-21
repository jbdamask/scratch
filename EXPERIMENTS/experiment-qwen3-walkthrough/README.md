This was an experiment with the Ralph loop to make an app.
I used Ryan Carson's implementation of Ralph, https://github.com/snarktank/ralph

The idea was random - that is, the app doesn't matter. What I wanted to do is see how fast I could build something in and unattended fashion. But the app does work on my Mac. It has a backend runnable via uvicorn and a node frontend.
I won't be working on this app anymore.

In a nutshell, [this](https://github.com/jbdamask/scratch/tree/main/EXPERIMENTS/super-simple-ralph-example) is all Ralph is.
The idea is to start a new Claude session for each feature developed. This gives it a fresh context window, which reduces context rot. The only thing any given loop knows about is it's own work on a task, w whic is similar to how human engineers work. Easy to understand.

According to Geoffrey Huntley, the one who named the pattern, the most important thing for the software engineer is to write good specifications so that there's minimal ambiguity when Claude works on a task. 
This is because you run Claude in YOLO mode so you're not around to answer questions.

A video walkthrough with explaination is [here](https://youtu.be/bB4fOUgkfe8).

A couple of notes about this project:
1. Geoffrey says the most important job of the software engineer is writing good spec documents. I didn't do that in this experiment due to impatience. 
2. I used Ryan's implementation without scrutanizing it. If I had, I would have seen the prompt.md assumed I was using AMP instead of Claude Code.
3. Utimately, neither of these things mattered because I got a working app - which was my goal.
4. There's also some confusing stuff about issue tracking in this repo. To be clear, I didn't use Beads. It was simply installed by my [EC2 Claude Code](https://github.com/jbdamask/john-claude-skills/tree/main/skills/ec2-claude-code) skill.

Thoughts for future work:
1. I need to get a better handle on how fine-grained a specification document should be. There's certainly more than one per project, but I'm wondering if the right pattern is to have ARCHITECTURE.md, STYLEGUIDE.md, BACKEND.md, etc. 
2. There may be standard app architectures I want to re-use, in which case specs like GLOBAL-AWS-ARCHITECTURE.md, ELECTRON.md would be stored separatly.
3. I man want to tweak Ryan's implementation to suit my style of work. There was some friction with writing PRDs and feature specs. Not his fault; I'm very grateful that he impelemnted and shared.
4. The Ralph loop (e.g. outer loop) makes a ton of sense. It solves the problem of context rot. But it will be important to keep an eye on model development because this problem may not exist in future models
