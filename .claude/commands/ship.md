---
description: 변경사항을 커밋하고 원격에 푸시합니다
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git push:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*)
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -5`

## Your task

위 변경사항을 기반으로 커밋하고 원격에 푸시합니다.

### 순서

1. 변경된 파일을 확인하고 스테이징합니다 (.env, credentials 등 민감 파일 제외).
2. 변경 내용을 분석하여 간결한 커밋 메시지를 작성합니다 (한국어 가능).
3. 커밋을 생성합니다. 메시지 끝에 다음을 추가합니다:
   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
4. 현재 브랜치를 원격에 푸시합니다 (`git push -u origin <branch>`).
5. 푸시 결과를 사용자에게 알려줍니다.

### 규칙

- 커밋할 변경사항이 없으면 빈 커밋을 만들지 말고 사용자에게 알립니다.
- force push는 절대 하지 않습니다.
- main/master 브랜치에 직접 푸시하는 경우 사용자에게 확인을 받습니다.
- 커밋 메시지는 HEREDOC 형식으로 전달합니다.
