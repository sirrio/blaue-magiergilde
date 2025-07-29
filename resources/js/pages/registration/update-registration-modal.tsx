import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { TextArea } from '@/components/ui/text-area'
import { PageProps, Registration } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Edit } from 'lucide-react'
import React from 'react'

export default function UpdateRegistrationModal({ registration }: { registration: Registration }) {
  const { tiers, errors } = usePage<PageProps>().props
  const { data, setData, post } = useForm({
    character_name: registration.character_name,
    character_url: registration.character_url,
    start_tier: registration.start_tier,
    tier: registration.tier,
    notes: registration.notes ?? '',
  })

  const handleSubmit = () => {
    post(route('registrations.update', { registration, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square">
          <Edit size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Edit registration</ModalTitle>
      <ModalContent>
        <form>
          <Input errors={errors.character_name} value={data.character_name} onChange={(e) => setData('character_name', e.target.value)}>
            Name
          </Input>
          <Input errors={errors.character_url} value={data.character_url} onChange={(e) => setData('character_url', e.target.value)}>
            Sheet URL
          </Input>
          <Select errors={errors.start_tier} value={data.start_tier} onChange={(e) => setData('start_tier', e.target.value as Registration['start_tier'])}>
            <SelectLabel>Start Tier</SelectLabel>
            <SelectOptions>
              {Object.entries(tiers)
                .filter(([key]) => key !== 'et')
                .map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
            </SelectOptions>
          </Select>
          <Select errors={errors.tier} value={data.tier} onChange={(e) => setData('tier', e.target.value as Registration['tier'])}>
            <SelectLabel>Current Tier</SelectLabel>
            <SelectOptions>
              {Object.entries(tiers).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </SelectOptions>
          </Select>
          <TextArea errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </TextArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleSubmit}>Save</ModalAction>
    </Modal>
  )
}
