# Environment Variables Setup Guide

## Quick Setup

```bash
# Copy the template to create your .env file
cp ENV_TEMPLATE.txt .env

# Edit the .env file and add your API key
nano .env  # or use your preferred editor
```

## Required Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | **YES** | - | Your Google Gemini API key (get from https://makersuite.google.com/app/apikey) |
| `LLM_MODEL` | No | `gemini-1.5-flash` | Gemini model to use |
| `LLM_TEMPERATURE` | No | `0.7` | Response creativity (0.0-1.0) |
| `WEAVIATE_URL` | No | `http://localhost:8080` | Weaviate instance URL |
| `WEAVIATE_TENANT` | No | `tenant1` | Multi-tenant identifier |
| `LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |
| `NODE_ENV` | No | `development` | Environment mode |
| `RAG_MAX_RESULTS` | No | `3` | Max RAG results to return (1-10) |
| `DEBUG_AGENT` | No | `false` | Enable agent decision logging |

## Getting Your Google Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Paste it in your `.env` file as `GOOGLE_API_KEY=your_actual_key_here`

**Note**: The Gemini free tier provides:
- 60 requests per minute
- Sufficient for this POC application

## Example .env File

```bash
# Required
GOOGLE_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuv

# Optional (these are the defaults if not specified)
LLM_MODEL=gemini-1.5-flash
LLM_TEMPERATURE=0.7
WEAVIATE_URL=http://localhost:8080
WEAVIATE_TENANT=tenant1
LOG_LEVEL=info
NODE_ENV=development
RAG_MAX_RESULTS=3
DEBUG_AGENT=false
```

## Advanced Configuration

### LLM Temperature

Controls response creativity:
- `0.0` - Deterministic, consistent responses
- `0.3` - Slightly varied, good for classification
- `0.7` - **Default** - Balanced creativity
- `1.0` - Maximum creativity, more varied responses

### Log Levels

- `debug` - Very verbose, shows all internal operations
- `info` - **Default** - Important events and confirmations
- `warn` - Warnings and non-critical issues
- `error` - Only errors

### Debug Mode

Set `DEBUG_AGENT=true` to see:
- Intent classification reasoning
- Agent routing decisions
- Node execution flow
- Detailed state transitions

Useful for understanding how the agent makes decisions.

## Troubleshooting

### "Missing required environment variable: GOOGLE_API_KEY"
- Ensure `.env` file exists in project root
- Verify the key is set correctly without quotes
- Check there are no extra spaces

### LLM quota exceeded
- You've hit the free tier limit (60 req/min)
- Wait a minute and try again
- Consider upgrading to paid tier

### Weaviate connection issues
- Verify Docker containers are running: `docker-compose ps`
- Check `WEAVIATE_URL` matches your Docker setup
- Default `http://localhost:8080` should work

## Security Notes

⚠️ **NEVER commit your `.env` file to version control!**

The `.env` file is already in `.gitignore` and will not be committed.
Share the `ENV_TEMPLATE.txt` or this guide with team members instead.

---

**Files Available**:
- `ENV_TEMPLATE.txt` - Template with placeholder values
- `.env` - Your actual configuration (create from template)
- `ENV_SETUP.md` - This guide

