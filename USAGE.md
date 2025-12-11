# How to Use Reddit Mastermind

## Quick Start (30 seconds)

1. **Open the app**
2. **Select "Use SlideForge Sample Data"** (default)
3. **Click "Generate Content Calendar"**
4. **Done!** Your weekly content calendar appears on the right

---

## Step-by-Step Guide

### 1. Choose Generation Mode

| Mode | What it does | API Key needed? |
|------|--------------|-----------------|
| **Titles Only** | Generates post ideas, topics, and comment strategies | No |
| **Full Content** | Generates complete posts and realistic comment threads | Yes (OpenAI) |

### 2. Enter Your OpenAI Key (Full Content only)

- Paste your key in the "OpenAI API Key" field
- Your key stays in your browser, never sent to our servers
- Get a key at [platform.openai.com](https://platform.openai.com)

### 3. Configure Your Content

**Option A: Use Sample Data**
- Pre-loaded with SlideForge (AI presentation tool) example
- Great for testing the app

**Option B: Enter Custom Data**
- **Company Name**: Your product/company
- **Company Description**: What you do
- **Personas**: Reddit accounts (one per line, format: `username: description`)
- **Subreddits**: Target communities (one per line)
- **Keywords/Themes**: Topics to post about (one per line)
- **Posts per Week**: 1-7

### 4. Generate Calendar

Click **"Generate Content Calendar"** and wait:
- Titles Only: ~1-2 seconds
- Full Content: ~10-15 seconds

### 5. Review Your Calendar

Each post shows:
- 📅 **Date & Time**: When to post
- 👤 **Persona**: Which account posts
- 📍 **Subreddit**: Where to post
- 📝 **Post**: Title and body preview
- 💬 **Comments**: Planned supportive comments
- ⭐ **Quality Score**: 1-10 rating

Click **"Show full content"** to see complete post bodies.

### 6. Generate More Weeks

Click **"Generate Next Week →"** to plan additional weeks. The app remembers what you've posted to avoid repetition.

---

## Advanced Options

Expand **"Advanced Options"** to enable:

- **Auto-Improvement**: Automatically regenerate low-scoring posts (Full Content only)
- **LLM Quality Scoring**: Use AI to evaluate content quality
- **LLM Score Weight**: Balance between rule-based and AI scoring

---

## Tips

✅ **Start with sample data** to see how the app works  
✅ **Use 2-3 personas minimum** for natural-looking comment threads  
✅ **Target 3-5 subreddits** to avoid spam patterns  
✅ **Export JSON** to save your calendar for later reference

---

## FAQ

**Q: Why did my post get rejected?**  
A: Posts scoring below 6/10 are rejected. Try different themes or enable Auto-Improvement.

**Q: Why does Full Content mode take longer?**  
A: It makes multiple AI calls to generate realistic content. Each post requires ~3-4 seconds.

**Q: Is my API key safe?**  
A: Yes. It's stored only in your browser's localStorage and sent directly to OpenAI, never to our servers.

**Q: Can I edit the generated content?**  
A: The calendar is for planning. Copy the content and edit as needed before posting to Reddit.
