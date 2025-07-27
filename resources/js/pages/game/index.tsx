import LogoBt from '@/components/logo-bt'
import LogoEt from '@/components/logo-et'
import LogoHt from '@/components/logo-ht'
import LogoLt from '@/components/logo-lt'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { List, ListRow } from '@/components/ui/list'
import { calculateBubbleByFillerCharacters, calculateBubbleByGames } from '@/helper/calculateBubble'
import { calculateBubbleSpend } from '@/helper/calculateBubbleSpend'
import { calculateCoins } from '@/helper/calculateCoins'
import { calculateCoinsSpend } from '@/helper/calculateCoinsSpend'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { format } from 'date-fns'
import { AlertCircle, Coins, Droplets, PartyPopper, Plus, Settings, Swords } from 'lucide-react'
import StoreGameModal from '@/pages/game/store-game-modal'
import UpdateGameModal from '@/pages/game/update-game-modal'

export default function MasteredGames({ games, user, characters }) {
  const totalBubbles =
    calculateBubbleByGames(games) +
    calculateBubbleByFillerCharacters(characters) +
    (user.event_bubbles || 0) +
    (user.bt_bubbles || 0) +
    (user.lt_bubbles || 0) +
    (user.ht_bubbles || 0) +
    (user.et_bubbles || 0) +
    (user.other_bubbles || 0)

  const totalCoins =
    calculateCoins(games) +
    (user.event_coins || 0) +
    (user.bt_coins || 0) +
    (user.lt_coins || 0) +
    (user.ht_coins || 0) +
    (user.et_coins || 0) +
    (user.other_coins || 0)

  const spentBubbles = calculateBubbleSpend(characters)
  const spentCoins = calculateCoinsSpend(characters)
  const remainingBubbles = totalBubbles - spentBubbles
  const remainingCoins = totalCoins - spentCoins

  return (
    <AppLayout>
      <Head title="Mastered Games" />
      <div className="container mx-auto max-w-7xl space-y-8 px-4 py-6">
        <section className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Mastered Games <span className="text-base-content/70 ml-2 text-lg">{games.length} Games</span>
            </h1>
            <p className="text-base-content/70 text-sm">Manage your progress with a summary of all mastered games.</p>
          </div>
          <StoreGameModal>
            <Button variant="outline" size="sm" className="flex items-center">
              <Plus size={18} />
              <span>Create New Game</span>
            </Button>
          </StoreGameModal>
        </section>

        <Card>
          <CardBody>
            <CardTitle>Progress Summary</CardTitle>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {[
                  {
                    title: 'Bubbles',
                    icon: <Droplets size={20} className="mr-2" />,
                    spent: spentBubbles,
                    total: totalBubbles,
                    remaining: remainingBubbles,
                    overspentMessage: 'Overspent bubbles! Please adjust.',
                  },
                  {
                    title: 'Coins',
                    icon: <Coins size={20} className="mr-2" />,
                    spent: spentCoins,
                    total: totalCoins,
                    remaining: remainingCoins,
                    overspentMessage: 'Overspent coins! Recheck balance.',
                  },
                ].map(({ title, icon, spent, total, remaining, overspentMessage }, index) => (
                  <div key={index}>
                    <div className="-mb-1 flex items-center text-lg font-semibold">
                      {icon}
                      <span>{title}</span>
                    </div>
                    <progress className={'progress w-full'} value={spent} max={total} />
                    <div className="text-base-content/70 -mt-0.5 flex justify-between text-xs">
                      <span>Remaining: {remaining}</span>
                      <span>
                        Spent: {spent} / {total}
                      </span>
                    </div>
                    {spent > total && (
                      <p className="text-error mt-2 flex items-center text-xs">
                        <AlertCircle size={16} className="mr-2" />
                        {overspentMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Breakdown</CardTitle>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
                <div className="space-y-4 md:border-r md:pr-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Swords size={18} className="mr-2" />
                      Games
                    </div>
                    <div className="flex items-center space-x-4 text-right">
                      <span className="w-20">
                        {calculateBubbleByGames(games)} <Droplets size={16} className="inline" />
                      </span>
                      <span className="w-20">
                        {calculateCoins(games)} <Coins size={16} className="inline" />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Plus size={16} className="mr-2" />
                      Filler Character
                    </div>
                    <div className="flex items-center space-x-4 text-right">
                      <span className="w-20">
                        {calculateBubbleByFillerCharacters(characters)} <Droplets size={16} className="inline" />
                      </span>
                      <span className="w-20">
                        <Coins size={16} className="text-base-content/50 inline" />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <PartyPopper size={18} className="mr-2" />
                      Event Bonuses
                    </div>
                    <div className="flex items-center space-x-4 text-right">
                      <span className="w-20">
                        {user.event_bubbles || 0} <Droplets size={16} className="inline" />
                      </span>
                      <span className="w-20">
                        {user.event_coins || 0} <Coins size={16} className="inline" />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="">Other Bonuses</span>
                    </div>
                    <div className="flex items-center space-x-4 text-right">
                      <span className="w-20">
                        {user.other_bubbles || 0} <Droplets size={16} className="inline" />
                      </span>
                      <span className="w-20">
                        {user.other_coins || 0} <Coins size={16} className="inline" />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {['bt', 'lt', 'ht', 'et'].map((type) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center">
                        {type === 'bt' && <LogoBt width={20} />}
                        {type === 'lt' && <LogoLt width={20} />}
                        {type === 'ht' && <LogoHt width={20} />}
                        {type === 'et' && <LogoEt width={20} />}
                        <span className="ml-2 capitalize">{type} Bonuses</span>
                      </div>
                      <div className="flex items-center space-x-4 text-right">
                        <span className="w-20">
                          {user[`${type}_bubbles`] || 0} <Droplets size={16} className="inline" />
                        </span>
                        <span className="w-20">
                          {user[`${type}_coins`] || 0} <Coins size={16} className="inline" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CardBody>
        </Card>

        <div>
          <h2 className="mb-6 text-xl font-semibold">Your Games</h2>
          {games.length > 0 ? (
            <List>
              {games.map((game, index) => (
                <ListRow key={game.id}>
                  <h3>
                    #{games.length - index} {game.tier === 'bt' && <LogoBt width={16} />}
                    {game.tier === 'lt' && <LogoLt width={16} />}
                    {game.tier === 'ht' && <LogoHt width={16} />}
                    {game.tier === 'et' && <LogoEt width={16} />} {game.title ?? 'Game'}
                  </h3>
                  <p className={'text-base-content/50 truncate text-xs'}>{game.notes ?? 'No notes'}</p>
                  <p className={'text-xs'}>
                    {calculateBubbleByGames([game])} <Droplets size={13} className="inline" />
                  </p>
                  <p className={'text-xs'}>
                    {calculateCoins([game])} <Coins size={13} className="inline" />
                  </p>
                  <div className={'text-base-content/70 font-mono'}>{format(new Date(game.start_date), 'dd.MM.yyyy')}</div>
                  <UpdateGameModal game={game}>
                    <Button size={'xs'} modifier={'square'} variant={'ghost'}>
                      <Settings size={14}></Settings>
                    </Button>
                  </UpdateGameModal>
                </ListRow>
              ))}
            </List>
          ) : (
            <p className="mt-4 text-center text-sm text-gray-500">No games found. Start by creating a new game!</p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
