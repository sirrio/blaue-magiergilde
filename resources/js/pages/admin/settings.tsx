import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import { VoiceSettings } from '@/types'
import { Head, useForm } from '@inertiajs/react'
import { useEffect } from 'react'

export default function Settings({ voiceSettings }: { voiceSettings: VoiceSettings }) {
  const { data, setData, patch, processing, errors } = useForm({
    voice_channel_id: voiceSettings?.voice_channel_id ?? '',
  })

  useEffect(() => {
    setData('voice_channel_id', voiceSettings?.voice_channel_id ?? '')
  }, [setData, voiceSettings?.voice_channel_id])

  const handleSubmit = () => {
    patch(route('voice-settings.update'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Einstellungen gespeichert', 'info')
      },
      onError: () => {
        toast.show('Einstellungen konnten nicht gespeichert werden.', 'error')
      },
    })
  }

  return (
    <AppLayout>
      <Head title="Admin Settings" />
      <div className="container mx-auto max-w-2xl px-2 py-4 md:px-0">
        <Card className="card-xs">
          <CardBody>
            <CardTitle>Discord Bot</CardTitle>
            <CardContent>
              <p className="text-xs text-base-content/70">
                Die Voice Channel ID steuert die Live-Kandidatenliste in den Auktionen.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Input
                  errors={errors.voice_channel_id}
                  value={data.voice_channel_id}
                  onChange={(e) => setData('voice_channel_id', e.target.value)}
                >
                  Voice Channel ID
                </Input>
                <Button size="sm" variant="outline" onClick={handleSubmit} disabled={processing}>
                  Speichern
                </Button>
              </div>
            </CardContent>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
