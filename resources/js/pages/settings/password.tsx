import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import AppLayout from '@/layouts/app-layout'
import { Head, useForm } from '@inertiajs/react'
import { Lock } from 'lucide-react'

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
      <div className="container mx-auto max-w-3xl space-y-6 p-4">
        <section className="border-b border-base-200 pb-3">
          <h1 className="text-xl font-bold sm:text-2xl">Password</h1>
          <p className="text-sm text-base-content/70">Update your account password.</p>
        </section>
        <Card className="border border-base-200">
          <CardBody>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock size={16} />
              Change Password
            </CardTitle>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
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
                  New Password
                </Input>
                <Input
                  type="password"
                  value={form.data.password_confirmation}
                  onChange={(e) => form.setData('password_confirmation', e.target.value)}
                  errors={form.errors.password_confirmation}
                >
                  Confirm Password
                </Input>
                <div className="flex justify-end">
                  <Button type="submit" className="btn-primary" disabled={form.processing}>
                    Save
                  </Button>
                </div>
              </form>
            </CardContent>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
