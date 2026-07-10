---
description: Run the live verification harness against the deployed Pages site and report per step.
---
Run `npm run verify:live` in this repo. Output one line per step: PASS, or the
first failure with its evidence (the failing step name and the screenshot path
under verify-artifacts/). If everything passes, state that the deployment is
verified shipped as of now, with the timestamp. Do not summarise; report per
step.
