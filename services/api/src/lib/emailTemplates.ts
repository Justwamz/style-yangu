// Branded transactional email templates. Each returns { subject, html }.

const BRAND = '#8B4513'
const DARK = '#1A0F0A'
const GOLD = '#D4A853'
const CREAM = '#FAF6F1'

function layout(heading: string, bodyHtml: string): string {
  return `
  <div style="margin:0;padding:0;background:${CREAM};font-family:'DM Sans',Helvetica,Arial,sans-serif;color:${DARK};">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;padding-bottom:24px;">
        <span style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:${DARK};">
          Style<span style="color:${GOLD};">Yangu</span>
        </span>
      </div>
      <div style="background:#ffffff;border:1px solid #EFE6DA;border-radius:14px;padding:28px 24px;">
        <h1 style="font-family:Georgia,serif;font-weight:400;font-size:24px;margin:0 0 14px;color:${DARK};">${heading}</h1>
        ${bodyHtml}
      </div>
      <p style="text-align:center;font-size:11px;color:#9b8b7a;margin-top:22px;">
        Powered by Style Yangu · Your honest stylist, in your pocket.
      </p>
    </div>
  </div>`
}

function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;
    padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;margin-top:8px;">${label}</a>`
}

const p = (text: string) => `<p style="font-size:15px;line-height:1.6;color:#3a2a1e;margin:0 0 12px;">${text}</p>`

export function welcomeEmail(): { subject: string; html: string } {
  return {
    subject: 'Welcome to Style Yangu',
    html: layout('Karibu! 🎉', [
      p('Your account is ready. Amara and Kofi — your personal stylists — are excited to help you dress like you.'),
      p('Complete your style profile to start getting honest, personalised outfit ideas every day.'),
    ].join('')),
  }
}

export function orderReadyEmail(shopName: string, balanceKES: number): { subject: string; html: string } {
  return {
    subject: `Your order is ready at ${shopName}`,
    html: layout('Your order is ready 🧵', [
      p(`Good news — your order at <strong>${shopName}</strong> is ready for collection.`),
      p(`Balance due on collection: <strong>KES ${balanceKES.toLocaleString()}</strong>.`),
      p('Please arrange collection at their listed workshop.'),
    ].join('')),
  }
}

export function orderReceivedEmail(shopName: string, expected: string): { subject: string; html: string } {
  return {
    subject: `Order received at ${shopName}`,
    html: layout('Order received ✅', [
      p(`Your order has been received at <strong>${shopName}</strong>.`),
      p(`Expected: <strong>${expected}</strong>. They'll be in touch to confirm details and measurements.`),
    ].join('')),
  }
}

export function tryOnEmail(shopName: string, appUrl: string): { subject: string; html: string } {
  return {
    subject: `${shopName} sent you something to try on`,
    html: layout('A pick just for you 👗', [
      p(`<strong>${shopName}</strong> thinks this item suits your style. See it rendered on your avatar in the app.`),
      button('Open Style Yangu', appUrl),
    ].join('')),
  }
}

export function referralConvertedEmail(amountKES: number): { subject: string; html: string } {
  return {
    subject: 'You earned a referral reward',
    html: layout('You earned KES ' + amountKES.toLocaleString() + ' 🎉', [
      p('Someone you referred just upgraded to a paid plan. Your commission has been added to this month\'s earnings.'),
      p('Payouts are made monthly to your M-Pesa (minimum KES 1,000).'),
    ].join('')),
  }
}
