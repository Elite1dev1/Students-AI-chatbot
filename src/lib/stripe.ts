import { PLANS } from '@/config/stripe'
import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import Stripe from 'stripe'

// Initialize Stripe with error handling for missing key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment variables')
}
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
  typescript: true,
})

export async function getUserSubscriptionPlan() {
  try {
    const { getUser } = getKindeServerSession()
    const user = getUser()

    // Return default plan if user is not logged in
    if (!user || !user.id) {
      return {
        ...PLANS[0],
        isSubscribed: false,
        isCanceled: false,
        stripeCurrentPeriodEnd: null,
      }
    }

    // Fetch user data from the database
    const dbUser = await db.user.findFirst({
      where: {
        id: user.id,
      },
    })

    // Return default plan if no user data is found
    if (!dbUser) {
      return {
        ...PLANS[0],
        isSubscribed: false,
        isCanceled: false,
        stripeCurrentPeriodEnd: null,
      }
    }

    // Determine subscription status
    const isSubscribed = Boolean(
      dbUser.stripePriceId &&
        dbUser.stripeCurrentPeriodEnd &&
        dbUser.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now()
    )

    // Find matching plan
    const plan = isSubscribed
      ? PLANS.find((plan) => plan.price.priceIds.test === dbUser.stripePriceId)
      : null

    // Check cancellation status from Stripe
    let isCanceled = false
    if (isSubscribed && dbUser.stripeSubscriptionId) {
      try {
        const stripePlan = await stripe.subscriptions.retrieve(
          dbUser.stripeSubscriptionId
        )
        isCanceled = stripePlan.cancel_at_period_end
      } catch (stripeError) {
        console.error('Error retrieving Stripe subscription:', stripeError)
        // Optionally handle errors when fetching from Stripe
      }
    }

    return {
      ...plan,
      stripeSubscriptionId: dbUser.stripeSubscriptionId,
      stripeCurrentPeriodEnd: dbUser.stripeCurrentPeriodEnd,
      stripeCustomerId: dbUser.stripeCustomerId,
      isSubscribed,
      isCanceled,
    }
  } catch (error) {
    console.error('Error in getUserSubscriptionPlan:', error)
    // Return a default plan on failure
    return {
      ...PLANS[0],
      isSubscribed: false,
      isCanceled: false,
      stripeCurrentPeriodEnd: null,
    }
  }
}
