import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { useForm, usePage } from '@inertiajs/react'
import React from 'react'
import type { PageProps } from '@/types'

export default function LoginModal({ children }: React.PropsWithChildren) {
  const { features } = usePage<PageProps>().props
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  })

  const submit = () => {
    post(route('login'))
  }

  return (
    <Modal>
      <ModalTrigger>{children}</ModalTrigger>
      <ModalTitle>Login</ModalTitle>
      <ModalContent>
        <div className="flex flex-col space-y-4">
          {features.discord && (
            <Button as="a" href={route('discord.login')} color="primary" modifier="block">
              Login with Discord
            </Button>
          )}
          <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} errors={errors.email}>
            Email
          </Input>
          <Input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} errors={errors.password}>
            Password
          </Input>
        </div>
      </ModalContent>
      <ModalAction onClick={submit} disabled={processing}>
        Login
      </ModalAction>
    </Modal>
  )
}
