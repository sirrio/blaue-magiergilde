import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { Head, useForm, usePage } from '@inertiajs/react'
import type { PageProps } from '@/types'

export default function RegistrationForm() {
  const { tiers } = usePage<PageProps>().props
  const { data, setData, post, processing, errors } = useForm({
    link: '',
    start_tier: 'bt',
    tier: 'bt',
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
          <Select errors={errors.start_tier} value={data.start_tier} onChange={(e) => setData('start_tier', e.target.value as (typeof data.start_tier))}>
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
          <Select errors={errors.tier} value={data.tier} onChange={(e) => setData('tier', e.target.value as (typeof data.tier))}>
            <SelectLabel>Tier</SelectLabel>
            <SelectOptions>
              {Object.entries(tiers).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </SelectOptions>
          </Select>
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
