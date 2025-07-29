import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/text-area'
import { Head, useForm } from '@inertiajs/react'

export default function RegistrationForm() {
  const { data, setData, post, processing, errors } = useForm({
    link: '',
    tier: '',
    notes: '',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route('registrations.store'))
  }

  return (
    <>
      <Head title="Registration" />
      <div className="hero bg-base-200 min-h-screen">
        <form onSubmit={submit} className="hero-content card w-full max-w-sm flex-col space-y-4 p-6 shadow">
          <h1 className="text-2xl font-bold text-center">Character Registration</h1>
          <Input value={data.link} onChange={e => setData('link', e.target.value)} errors={errors.link}>
            Character Sheet Link
          </Input>
          <Input value={data.tier} onChange={e => setData('tier', e.target.value)} errors={errors.tier}>
            Tier
          </Input>
          <TextArea
            value={data.notes}
            onChange={(e) => setData('notes', e.target.value)}
            errors={errors.notes}
            placeholder="Additional notes"
          >
            Notes
          </TextArea>
          <Button type="submit" disabled={processing} className="btn-primary w-full">
            Submit
          </Button>
        </form>
      </div>
    </>
  )
}
