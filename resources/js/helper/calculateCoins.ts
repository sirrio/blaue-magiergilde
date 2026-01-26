import { Game } from '@/types'

const calculateCoins = (game: Game[]): number => {
  return game.reduce((coin: number, game: Game): number => {
    if (game.coins_disabled) return coin
    return coin + game.sessions + (game.has_additional_bubble ? -1 : 0)
  }, 0)
}

export { calculateCoins }
