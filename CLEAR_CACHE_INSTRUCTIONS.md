# How to Clear Browser Cache and Force Reload

The Supabase blocker is now in place, but your browser is using a cached JavaScript bundle. Follow these steps:

## Step 1: Wait for Vercel Deployment
- Check Vercel dashboard to ensure the latest deployment is complete
- Look for the latest commit: "fix: Improve Supabase blocker with XHR interception"

## Step 2: Hard Refresh Your Browser

### Chrome/Edge (Windows/Linux):
1. Press `Ctrl + Shift + R` OR
2. Press `Ctrl + F5` OR
3. Press `Ctrl + Shift + Delete` → Clear cached images and files → Reload

### Chrome/Edge (Mac):
1. Press `Cmd + Shift + R` OR
2. Press `Cmd + Option + R`

### Firefox:
1. Press `Ctrl + Shift + R` (Windows/Linux) OR
2. Press `Cmd + Shift + R` (Mac) OR
3. Press `Ctrl + F5`

### Safari:
1. Press `Cmd + Option + E` (clears cache) then reload OR
2. Press `Cmd + Shift + R`

## Step 3: Clear Browser Cache Completely (If Hard Refresh Doesn't Work)

### Chrome/Edge:
1. Press `F12` to open DevTools
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Firefox:
1. Press `F12` to open DevTools
2. Go to Network tab
3. Check "Disable cache"
4. Reload the page

## Step 4: Verify the Blocker is Active

After reloading, open the browser console (F12) and check for:
- `🛡️ Supabase request blocker activated (fetch + XHR)`
- If you see `🚫 BLOCKED Supabase request:` messages, the blocker is working!

## Step 5: If Still Seeing Supabase Requests

1. **Check Vercel Deployment Status**: Make sure the latest code is deployed
2. **Check Console for Blocker Message**: You should see "Supabase request blocker activated"
3. **Try Incognito/Private Mode**: This bypasses all cache
4. **Clear All Site Data**:
   - Chrome: Settings → Privacy → Clear browsing data → Advanced → All time → Check "Cached images and files"
   - Or use DevTools → Application → Clear storage → Clear site data

## What Should Happen After Cache Clear

✅ Console shows: `🛡️ Supabase request blocker activated (fetch + XHR)`
✅ No more `406 (Not Acceptable)` errors from Supabase
✅ No more network requests to `supabase.co` domains
✅ Dashboard loads (even if empty, no errors)

## If Problems Persist

The blocker intercepts both `fetch()` and `XMLHttpRequest`. If you still see Supabase requests:
1. Check the Network tab in DevTools
2. Look for any requests to `supabase.co`
3. If you see them, they should show as "Blocked" or "Failed"
4. Share the console output for further debugging

