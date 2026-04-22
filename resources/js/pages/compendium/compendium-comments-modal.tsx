import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle } from '@/components/ui/modal'
import { TextArea } from '@/components/ui/text-area'
import { CompendiumComment } from '@/types'
import { router, useForm } from '@inertiajs/react'
import { format } from 'date-fns'
import { MessageSquare, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'

export function CompendiumCommentsModal({
  title,
  comments = [],
  count = 0,
  storeRoute,
}: {
  title: string
  comments?: CompendiumComment[]
  count?: number
  storeRoute: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    body: '',
  })

  const sortedComments = useMemo(
    () =>
      [...comments].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime
      }),
    [comments],
  )

  const handleSubmit = () => {
    post(storeRoute, {
      preserveScroll: true,
      onSuccess: () => {
        reset()
        setData('body', '')
      },
    })
  }

  const handleDelete = (commentId: number) => {
    if (!window.confirm('Kommentar löschen?')) {
      return
    }

    router.delete(route('compendium.comments.destroy', { compendiumComment: commentId }), {
      preserveScroll: true,
    })
  }

  return (
    <>
      <Button size="xs" variant="ghost" modifier="square" aria-label="Kommentare" onClick={() => setIsOpen(true)}>
        <MessageSquare size={14} />
        {count > 0 ? <span className="text-[10px]">{count}</span> : null}
      </Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{title}</ModalTitle>
      <ModalContent>
        <div className="space-y-4">
          <div className="space-y-2">
            {sortedComments.length === 0 ? (
              <p className="text-sm text-base-content/60">Noch keine Kommentare.</p>
            ) : (
              sortedComments.map((comment) => (
                <div key={comment.id} className="rounded-box border border-base-200 bg-base-100 p-3">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-base-content/80">{comment.user?.name ?? 'Unbekannt'}</p>
                      <p className="text-[11px] text-base-content/50">
                        {comment.created_at ? format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm') : '—'}
                      </p>
                    </div>
                    {comment.can_delete ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        modifier="square"
                        color="error"
                        onClick={() => handleDelete(comment.id)}
                        aria-label="Kommentar löschen"
                      >
                        <Trash size={12} />
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-base-content/80">{comment.body}</p>
                </div>
              ))
            )}
          </div>

          <TextArea
            value={data.body}
            onChange={(event) => setData('body', event.target.value)}
            errors={errors.body}
            placeholder="Kommentar schreiben..."
          >
            Kommentar
          </TextArea>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Kommentar senden
      </ModalAction>
      </Modal>
    </>
  )
}
