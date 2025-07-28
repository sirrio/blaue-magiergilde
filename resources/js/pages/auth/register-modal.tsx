import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { useForm, usePage } from '@inertiajs/react'
import React from 'react'
import type { PageProps } from '@/types'

export default function RegisterModal({ children }: React.PropsWithChildren) {
  const { features } = usePage<PageProps>().props
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  const submit = () => {
    post(route('register'))
  }

  return (
    <Modal>
      <ModalTrigger>{children}</ModalTrigger>
      <ModalTitle>Register</ModalTitle>
      <ModalContent>
        <div className="flex flex-col space-y-4">
          {features.discord && (
            <Button as="a" href={route('discord.login')} color="primary" modifier="block">
              Register with Discord
            </Button>
          )}
          <Input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} errors={errors.name}>
            Name
          </Input>
          <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} errors={errors.email}>
            Email
          </Input>
          <Input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} errors={errors.password}>
            Password
          </Input>
          <Input
            type="password"
            value={data.password_confirmation}
            onChange={(e) => setData('password_confirmation', e.target.value)}
            errors={errors.password_confirmation}
          >
            Confirm Password
          </Input>
        </div>
      </ModalContent>
      <ModalAction onClick={submit} disabled={processing}>
        Register
      </ModalAction>
    </Modal>
  )
}
