# Checkmate Chess

A static chess game with:

- Computer play on **Easy**, **Medium**, and **Hard**.
- Same-device two-player mode.
- Shareable friend invite links and join-by-code options powered by PeerJS WebRTC.

## Run locally

Open `index.html` in a browser, or serve the folder with any static server:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Free deployment (GitHub Pages)

1. Create a new GitHub repository and upload `index.html`, `style.css`, `app.js`, and `README.md`.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then click **Save**.
5. After GitHub finishes publishing, open the displayed `https://your-name.github.io/repository-name/` URL.
6. Use **Generate invite link** in the game. Send the invite link or copy and share the full invite code; your friend can paste either into **Join with an invite code or link**. Both players need an internet connection because the game uses the free PeerJS signaling service.

Other free static hosts such as Netlify, Vercel, and Cloudflare Pages work too: import the repository, use the project root as the publish directory, and leave the build command empty.
