import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { User } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Settings } from 'lucide-react'
import React from 'react'

const UpdateBreakdownModal = ({ user, children }: { user: User; children?: React.ReactNode }) => {
  const initialFormData = {
    event_bubbles: user.event_bubbles || 0,
    event_coins: user.event_coins || 0,
    bt_bubbles: user.bt_bubbles || 0,
    bt_coins: user.bt_coins || 0,
    lt_bubbles: user.lt_bubbles || 0,
    lt_coins: user.lt_coins || 0,
    ht_bubbles: user.ht_bubbles || 0,
    ht_coins: user.ht_coins || 0,
    et_bubbles: user.et_bubbles || 0,
    et_coins: user.et_coins || 0,
    other_bubbles: user.other_bubbles || 0,
    other_coins: user.other_coins || 0,
  }

  const { data, setData, post } = useForm(initialFormData)
  const { errors } = usePage().props

  const handleFormSubmit = () => {
    post(route('breakdowns.update', { breakdown: user.id, _method: 'put' }), {
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
          <Input type="number" value={data.event_bubbles} onChange={e => setData('event_bubbles', Number(e.target.value))} errors={errors.event_bubbles}>
            Event Bubbles
          </Input>
          <Input type="number" value={data.event_coins} onChange={e => setData('event_coins', Number(e.target.value))} errors={errors.event_coins}>
            Event Coins
          </Input>
          <Input type="number" value={data.other_bubbles} onChange={e => setData('other_bubbles', Number(e.target.value))} errors={errors.other_bubbles}>
            Other Bubbles
          </Input>
          <Input type="number" value={data.other_coins} onChange={e => setData('other_coins', Number(e.target.value))} errors={errors.other_coins}>
            Other Coins
          </Input>
          {(['bt', 'lt', 'ht', 'et'] as const).map((type) => (
            <React.Fragment key={type}>
              <Input
                type="number"
                value={data[`${type}_bubbles`]}
                onChange={e => setData(`${type}_bubbles`, Number(e.target.value))}
                errors={errors[`${type}_bubbles`]}
              >
                {type.toUpperCase()} Bubbles
              </Input>
              <Input
                type="number"
                value={data[`${type}_coins`]}
                onChange={e => setData(`${type}_coins`, Number(e.target.value))}
                errors={errors[`${type}_coins`]}
              >
                {type.toUpperCase()} Coins
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
