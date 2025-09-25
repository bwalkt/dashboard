# Supabase Authentication Setup Guide

This guide will help you set up Supabase authentication with GitHub OAuth for your dashboard application.

## Prerequisites

1. A GitHub account
2. A Supabase account (sign up at [supabase.com](https://supabase.com))

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `dashboard-auth` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Choose the closest region to your users
5. Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 3: Set Up GitHub OAuth

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **GitHub** in the list and click **Configure**
3. Enable GitHub provider
4. You'll need to create a GitHub OAuth App:

### Create GitHub OAuth App

1. Go to GitHub → **Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name**: `Dashboard App` (or your preferred name)
   - **Homepage URL**: `http://localhost:5173` (for development)
   - **Authorization callback URL**: `https://your-project-id.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Copy the **Client ID** and **Client Secret**

### Configure Supabase with GitHub Credentials

1. Back in Supabase, paste your GitHub **Client ID** and **Client Secret**
2. Click **Save**

## Step 4: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:

   ```bash
   cp env.example.txt .env
   ```

2. Update the `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Step 5: Update Site URL (Important!)

1. In your Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Update the **Site URL** to: `http://localhost:5173`
3. Add `http://localhost:5173` to **Redirect URLs**
4. Click **Save**

## Step 6: Test the Authentication

1. Start your development server:

   ```bash
   bun run dev
   ```

2. Navigate to `http://localhost:5173`
3. You should be redirected to the sign-in page
4. Click "Continue with Github"
5. You should be redirected to GitHub for authorization
6. After authorizing, you should be redirected back to your dashboard

## Troubleshooting

### Common Issues

1. **"Invalid redirect URL" error**:

   - Make sure your GitHub OAuth App callback URL matches your Supabase project URL
   - Ensure the Site URL in Supabase matches your development URL

2. **"Invalid client" error**:

   - Double-check your GitHub Client ID and Client Secret in Supabase
   - Make sure the GitHub OAuth App is properly configured

3. **Environment variables not loading**:
   - Make sure your `.env` file is in the project root
   - Restart your development server after changing environment variables
   - Variables must start with `VITE_` to be accessible in the frontend

### Getting Help

- Check the [Supabase Auth documentation](https://supabase.com/docs/guides/auth)
- Check the [GitHub OAuth documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)

## Production Deployment

When deploying to production:

1. Update your GitHub OAuth App with your production URL
2. Update Supabase Site URL and Redirect URLs with your production domain
3. Set environment variables in your hosting platform
4. Ensure your production domain is added to Supabase's allowed origins

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive configuration
- Regularly rotate your API keys and secrets
- Monitor your Supabase project for unusual activity
