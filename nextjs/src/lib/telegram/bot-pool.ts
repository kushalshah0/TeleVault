/**
 * Telegram Bot Pool for parallel uploads
 * Manages multiple bot tokens for concurrent file operations
 */
import TelegramBot from 'node-telegram-bot-api'

class TelegramBotPool {
  private bots: TelegramBot[]
  private currentIndex: number = 0
  private static instance: TelegramBotPool

  private constructor() {
    // Load bot tokens from environment
    // Support both comma-separated (TELEGRAM_BOT_TOKENS) and individual tokens
    let tokens: string[] = []
    
    // Try comma-separated format first (like FastAPI)
    const commaSeparated = process.env.TELEGRAM_BOT_TOKENS
    if (commaSeparated) {
      tokens = commaSeparated.split(',').map(t => t.trim()).filter(Boolean)
    } else {
      // Fallback to individual tokens
      tokens = [
        process.env.TELEGRAM_BOT_TOKEN_1,
        process.env.TELEGRAM_BOT_TOKEN_2,
        process.env.TELEGRAM_BOT_TOKEN_3,
        process.env.TELEGRAM_BOT_TOKEN_4,
        process.env.TELEGRAM_BOT_TOKEN_5,
      ].filter((token): token is string => Boolean(token))
    }

    if (tokens.length === 0) {
      throw new Error('No Telegram bot tokens configured. Please set TELEGRAM_BOT_TOKEN_1 in environment variables.')
    }

    // Initialize bots (no polling, just API calls)
    // Add longer timeout for large file uploads
    this.bots = tokens.map(token => new TelegramBot(token, { 
      polling: false,
      request: {
        timeout: 120000,
        agentOptions: {
          keepAlive: true,
          keepAliveMsecs: 10000
        }
      } as any
    }))
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TelegramBotPool {
    if (!TelegramBotPool.instance) {
      TelegramBotPool.instance = new TelegramBotPool()
    }
    return TelegramBotPool.instance
  }

  /**
   * Get next bot in round-robin fashion
   */
  public getNextBot(): { bot: TelegramBot; index: number } {
    const bot = this.bots[this.currentIndex]
    const index = this.currentIndex
    this.currentIndex = (this.currentIndex + 1) % this.bots.length
    return { bot, index }
  }

  /**
   * Get specific bot by index
   */
  public getBot(index: number): TelegramBot {
    if (index < 0 || index >= this.bots.length) {
      throw new Error(`Invalid bot index: ${index}. Available bots: 0-${this.bots.length - 1}`)
    }
    return this.bots[index]
  }

  /**
   * Get total number of bots
   */
  public getBotCount(): number {
    return this.bots.length
  }
}

// Export singleton instance
export const botPool = TelegramBotPool.getInstance()
