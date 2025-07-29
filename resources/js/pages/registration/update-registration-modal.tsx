import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { TextArea } from '@/components/ui/text-area'
import { PageProps, Registration } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Edit } from 'lucide-react'
import React from 'react'

export default function UpdateRegistrationModal({ registration }: { registration: Registration }) {
  const { errors } = usePage<PageProps>().props
  const { data, setData, post } = useForm({
    character_name: registration.character_name,
    character_url: registration.character_url,
    start_tier: registration.start_tier,
    tier: registration.tier,
    discord_name: registration.discord_name,
    discord_id: registration.discord_id,
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
          <Input errors={errors.start_tier} value={data.start_tier} onChange={(e) => setData('start_tier', e.target.value)}>
            Start Tier
          </Input>
          <Input errors={errors.tier} value={data.tier} onChange={(e) => setData('tier', e.target.value)}>
            Current Tier
          </Input>
          <Input errors={errors.discord_name} value={data.discord_name} onChange={(e) => setData('discord_name', e.target.value)}>
            Discord Name
          </Input>
          <Input errors={errors.discord_id} value={data.discord_id} onChange={(e) => setData('discord_id', Number(e.target.value))}>
            Discord ID
          </Input>
          <TextArea errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </TextArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleSubmit}>Save</ModalAction>
    </Modal>
  )
}
