
#ROAD SIGN DETECTOR#

![Status](https://img.shields.io/badge/Status-Production-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Deployed](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)

A web application that classifies road signs from uploaded images and delivers instant, plain-language explanations of their meanings.

**LIVE DEMO:** https://road-sign-detector.vercel.app

SCREENSHOT
<img width="1908" height="877" alt="Screenshot 2026-04-29 020718" src="https://github.com/user-attachments/assets/99f00a6b-26a1-446f-9ee9-a3818a1b7680" />



---

## ABOUT

Road signs are critical to driver safety, yet many drivers — especially new arrivals, tourists, and learners — encounter unfamiliar signs with no immediate reference. This tool allows anyone to upload a road sign image and instantly understand what it means, no manual lookup required.

---

## HOW IT WORKS

```
Image Upload  →  Next.js API Route  →  AI Classification Engine  →  Sign Label + Explanation
```

---

## FEATURES

- Upload any road sign image for instant classification
- Plain-language explanation of the sign's meaning and legal implication
- Supports a wide range of sign types: regulatory, warning, and informational
- Mobile-optimised — works directly from a phone camera roll
- No account required, no data stored

---

## TECH STACK

| Layer      | Technology              |
|------------|-------------------------|
| Framework  | Next.js 15 (App Router) |
| Language   | TypeScript              |
| Styling    | Tailwind CSS            |
| AI Engine  | Claude API (Anthropic)  |
| Deployment | Vercel                  |

---

## INSTALLATION

**Prerequisites:** Node.js 18+, Anthropic API key

```bash
git clone https://github.com/YOUR_USERNAME/road-sign-detector.git
cd road-sign-detector
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## ROADMAP

- [ ] UAE and GCC road sign database
- [ ] Arabic language support
- [ ] Real-time camera detection
- [ ] Offline mode (on-device model)

---

## AUTHOR

**SHAHINA.S** — Full Stack Developer & AI Engineer, UAE

- Portfolio: https://yoursite.com
- LinkedIn: https://linkedin.com/in/yourhandle
- Email: you@email.com

---

*MIT License. Open source.*
