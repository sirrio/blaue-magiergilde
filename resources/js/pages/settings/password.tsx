import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AppLayout from '@/layouts/app-layout'
import { Head, useForm } from '@inertiajs/react'

export default function Password() {
  const form = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    form.put(route('password.update'))
  }

  return (
    <AppLayout>
      <Head title="Password" />
      <div className="container mx-auto max-w-xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">Password</h1>
        <form onSubmit={submit} className="card bg-base-100 space-y-4 p-4">
          <Input
            type="password"
            value={form.data.current_password}
            onChange={(e) => form.setData('current_password', e.target.value)}
            errors={form.errors.current_password}
          >
            Current Password
          </Input>
          <Input
            type="password"
            value={form.data.password}
            onChange={(e) => form.setData('password', e.target.value)}
            errors={form.errors.password}
          >
            Password
          </Input>
          <Input
            type="password"
            value={form.data.password_confirmation}
            onChange={(e) => form.setData('password_confirmation', e.target.value)}
            errors={form.errors.password_confirmation}
          >
            Confirm Password
          </Input>
          <Button type="submit" className="btn-primary" disabled={form.processing}>
            Save
          </Button>
        </form>
      </div>
    </AppLayout>
  )
}
