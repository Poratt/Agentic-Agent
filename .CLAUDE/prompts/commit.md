Generate a commit message from the current diff.

Rules:
- Use Conventional Commits.
- Subject max 50 characters.
- Use imperative mood.
- Mention the main user-visible change.
- Add a body only when the why is not obvious.
- Do not include unrelated changes unless they are in the diff.

Format:

```txt
type(scope): short subject

Optional body explaining why.
```

Allowed types:
- feat
- fix
- docs
- refactor
- test
- chore
- style