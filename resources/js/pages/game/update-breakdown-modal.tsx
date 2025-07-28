import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { User } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Coins, Droplets, PartyPopper, Settings } from 'lucide-react'
import LogoBt from '@/components/logo-bt'
import LogoLt from '@/components/logo-lt'
import LogoHt from '@/components/logo-ht'
import LogoEt from '@/components/logo-et'
import React from 'react'

interface BreakdownForm extends Record<string, number> {
  event_bubbles: number
  event_coins: number
  bt_bubbles: number
  bt_coins: number
  lt_bubbles: number
  lt_coins: number
  ht_bubbles: number
  ht_coins: number
  et_bubbles: number
  et_coins: number
  other_bubbles: number
  other_coins: number
  [key: string]: number
}

const UpdateBreakdownModal = ({ user, children }: { user: User; children?: React.ReactNode }) => {
  const initialFormData: BreakdownForm = {
    event_bubbles: Number(user.event_bubbles ?? 0),
    event_coins: Number(user.event_coins ?? 0),
    bt_bubbles: Number(user.bt_bubbles ?? 0),
    bt_coins: Number(user.bt_coins ?? 0),
    lt_bubbles: Number(user.lt_bubbles ?? 0),
    lt_coins: Number(user.lt_coins ?? 0),
    ht_bubbles: Number(user.ht_bubbles ?? 0),
    ht_coins: Number(user.ht_coins ?? 0),
    et_bubbles: Number(user.et_bubbles ?? 0),
    et_coins: Number(user.et_coins ?? 0),
    other_bubbles: Number(user.other_bubbles ?? 0),
    other_coins: Number(user.other_coins ?? 0),
  }

  const { data, setData, put } = useForm<BreakdownForm>(initialFormData)
  const { errors } = usePage().props as { errors: Record<string, string> }

  const handleFormSubmit = () => {
    put(route('breakdowns.update', { user: user.id }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal wide>
      <ModalTrigger>
        {children ?? (
          <button className="btn btn-ghost btn-xs" type="button">
            <Settings size={14} />
          </button>
        )}
      </ModalTrigger>
      <ModalTitle>Edit Breakdown</ModalTitle>
      <ModalContent>
        <form className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            type="number"
            min={0}
            value={data.event_bubbles}
            onChange={(e) => setData('event_bubbles', Math.max(0, Number(e.target.value)))}
            errors={errors.event_bubbles}
          >
            <span className="flex items-center">
              <PartyPopper size={16} className="mr-2" /> Event Bubbles{' '}
              <Droplets size={14} className="ml-1" />
            </span>
          </Input>
          <Input
            type="number"
            value={data.event_coins}
            onChange={(e) => setData('event_coins', Number(e.target.value))}
            errors={errors.event_coins}
          >
            <span className="flex items-center">
              <PartyPopper size={16} className="mr-2" /> Event Coins{' '}
              <Coins size={14} className="ml-1" />
            </span>
          </Input>
          <Input
            type="number"
            min={0}
            value={data.other_bubbles}
            onChange={(e) => setData('other_bubbles', Math.max(0, Number(e.target.value)))}
            errors={errors.other_bubbles}
          >
            <span className="flex items-center">
              Other Bubbles <Droplets size={14} className="ml-1" />
            </span>
          </Input>
          <Input
            type="number"
            value={data.other_coins}
            onChange={(e) => setData('other_coins', Number(e.target.value))}
            errors={errors.other_coins}
          >
            <span className="flex items-center">
              Other Coins <Coins size={14} className="ml-1" />
            </span>
          </Input>
          {(['bt', 'lt', 'ht', 'et'] as const).map((type) => (
            <React.Fragment key={type}>
              <Input
                type="number"
                min={0}
                value={data[`${type}_bubbles`]}
                onChange={(e) => setData(`${type}_bubbles`, Math.max(0, Number(e.target.value)))}
                errors={errors[`${type}_bubbles`]}
              >
                <span className="flex items-center">
                  {type === 'bt' && <LogoBt width={16} />}
                  {type === 'lt' && <LogoLt width={16} />}
                  {type === 'ht' && <LogoHt width={16} />}
                  {type === 'et' && <LogoEt width={16} />}
                  <span className="ml-2">{type.toUpperCase()} Bubbles</span>{' '}
                  <Droplets size={14} className="ml-1" />
                </span>
              </Input>
              <Input
                type="number"
                value={data[`${type}_coins`]}
                onChange={(e) => setData(`${type}_coins`, Number(e.target.value))}
                errors={errors[`${type}_coins`]}
              >
                <span className="flex items-center">
                  {type === 'bt' && <LogoBt width={16} />}
                  {type === 'lt' && <LogoLt width={16} />}
                  {type === 'ht' && <LogoHt width={16} />}
                  {type === 'et' && <LogoEt width={16} />}
                  <span className="ml-2">{type.toUpperCase()} Coins</span>{' '}
                  <Coins size={14} className="ml-1" />
                </span>
              </Input>
            </React.Fragment>
          ))}
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default UpdateBreakdownModal
