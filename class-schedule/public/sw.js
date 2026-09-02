// 알림을 받아서 화면에 띄우는 역할.
// 앱이 꺼져 있어도 이 파일은 백그라운드에서 살아 있다.

self.addEventListener('push', (event) => {
  let data = { title: '우리 반 일정', body: '' }

  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // 형식이 다르면 그냥 글자로 취급한다
    if (event.data) data.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon.svg',
      badge: './icon.svg',
      tag: data.tag || 'class-schedule',
      data: { url: data.url || './' },
    })
  )
})

// 알림을 누르면 앱을 연다. 이미 열려 있으면 그 창을 앞으로 가져온다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow(event.notification.data?.url || './')
    })
  )
})
