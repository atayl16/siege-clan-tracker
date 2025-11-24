# Testing Guide for Clan Members

## 🎯 What We're Testing

This is a **major auth system update**. We need your help testing before we deploy to production!

## 📋 Test Checklist

### For All Users
- [ ] **Register a new account**
  - Go to `/register`
  - Create account with username: `test_[yourname]`
  - Should complete without hanging or errors
  - Check that you're redirected after registration

- [ ] **Login**
  - Go to `/login`
  - Login with your test account
  - Should redirect to `/profile` (regular users) or `/admin` (admins)
  - No console errors

- [ ] **Profile Page**
  - View your profile at `/profile`
  - Check that your username displays correctly
  - Try claiming a player if you haven't already

- [ ] **Members Page**
  - Go to `/members`
  - Should load clan members list
  - Should load within 2-3 seconds (not hang forever)

- [ ] **Logout**
  - Click logout
  - Should redirect to home page
  - Try accessing `/profile` - should redirect to login

### For Admins Only
- [ ] **Admin Dashboard**
  - Login should redirect to `/admin`
  - Check that admin functions work
  - Try editing a member
  - Try processing a claim request

## 🐛 How to Report Issues

### Option 1: Discord (Recommended)
Post in `#beta-testing` channel with:
```
Bug Report:
- What you were doing: [e.g., "Trying to login"]
- What happened: [e.g., "Page just spins forever"]
- Browser: [Chrome/Firefox/Safari]
- Screenshot: [if possible]
```

### Option 2: Take a Screenshot
1. Open browser DevTools (F12)
2. Go to Console tab
3. Take screenshot of any errors
4. Send to [your contact method]

## 📱 Testing Checklist by Device

Test on different devices if possible:
- [ ] Desktop (Chrome)
- [ ] Desktop (Firefox/Safari)
- [ ] Mobile (iOS Safari)
- [ ] Mobile (Android Chrome)

## ⚠️ Important Notes

- **Use test accounts only** - Username like `test_yourname`
- **Don't claim real players** during testing
- **This is staging** - Your test data won't carry over to production
- **Report ANY weirdness** - Better to over-report than under-report

## 🎉 Success Criteria

If you can complete all the checklist items without issues, the system is working!

## 🚨 Critical Issues (Report Immediately)

- Can't register at all
- Can't login at all
- Members page never loads (spins forever)
- Admin functions completely broken
- Getting security errors or "unauthorized" messages

## Timeline

**Testing Period:** [Date range]
**Go-Live Date:** [Target date]
**Your feedback by:** [Deadline]

Thank you for helping test! 🙏
# Staging Environment for Beta Testing
