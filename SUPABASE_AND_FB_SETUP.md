# Fatakesto TV - Supabase এবং Facebook Page Integration Setup Guide

আপনার ওয়েবসাইট থেকে সাধারণ ইউজারের পাঠানো ছবি সরাসরি ডেটাবেজে সংরক্ষণ করতে এবং এক ক্লিকের মাধ্যমে ফেসবুক পেইজে পোস্ট করতে নিচের ধাপগুলো অনুসরণ করুন।

---

## ১. Supabase সেটআপ (ডেটাবেজ ও ইমেজ স্টোরেজ)

Supabase-এ আপনার ছবি এবং টেক্সট ডেটা ফ্রিতে সংরক্ষণ করার জন্য একটি অ্যাকাউন্ট খুলুন এবং সেটআপ করুন:

1. **অ্যাকাউন্ট খুলুন:** [Supabase.com](https://supabase.com)-এ যান এবং একটি ফ্রি অ্যাকাউন্ট তৈরি করুন।
2. **নতুন প্রজেক্ট তৈরি করুন:** `New Project` বাটনে ক্লিক করে প্রজেক্টের নাম দিন (যেমন: `fatakestotv`) এবং একটি পাসওয়ার্ড সেট করুন।
3. **টেবিল তৈরি করুন (SQL Editor):**
   * বাম পাশের মেনু থেকে **SQL Editor**-এ যান।
   * **New Query**-তে ক্লিক করে নিচের SQL কোডটি পেস্ট করুন এবং ডানদিকের **Run** বাটনে ক্লিক করুন:
     ```sql
     create table post_requests (
       id uuid default gen_random_uuid() primary key,
       headline text not null,
       date text,
       image_url text not null,
       status text default 'pending',
       created_at timestamp with time zone default timezone('utc'::text, now()) not null
     );
     ```
   * এটি আপনার ডেটাবেজে `post_requests` নামে টেবিলটি তৈরি করে দেবে।

4. **স্টোরেজ বাকেট তৈরি করুন (Storage Bucket):**
   * বাম পাশের মেনু থেকে **Storage**-এ যান।
   * **New Bucket** বাটনে ক্লিক করুন।
   * বাকেটের নাম দিন: `news-images`
   * **অবশ্যই "Public bucket" অপশনটি চালু (Enable) করে দিন** (যাতে ইমেজগুলোর লিঙ্ক সরাসরি ফেসবুকে শেয়ার করা যায়)।
   * বাকেটটি তৈরি করুন।

5. **API কী কপি করুন:**
   * বাম পাশের মেনু থেকে **Project Settings** (গিয়ার আইকন) > **API**-তে যান।
   * এখান থেকে দুটি জিনিস কপি করে রাখুন:
     * **Project URL**
     * **`service_role` key** (এটি গোপন কী, যা আমাদের এপিআই রান করতে সাহায্য করবে। সাবধান: এটি কাউকে দেখাবেন না!)

---

## ২. Facebook Page Access Token সেটআপ (ফেসবুকে পোস্ট করার জন্য)

ফেসবুক পেইজে অটোমেটিক পোস্ট করার জন্য আপনার একটি **Page Access Token** প্রয়োজন হবে:

1. **Meta Developer App তৈরি করুন:**
   * [Meta for Developers](https://developer.facebook.com)-এ যান এবং আপনার ফেসবুক অ্যাকাউন্ট দিয়ে লগইন করুন।
   * **My Apps**-এ গিয়ে **Create App**-এ ক্লিক করুন।
   * টাইপ সিলেক্ট করুন **Other** এবং পরবর্তী ধাপে **Business** সিলেক্ট করুন। অ্যাপের নাম দিয়ে তৈরি করুন।

2. **এক্সেস টোকেন জেনারেট করুন (Graph API Explorer):**
   * ডেভেলপার ড্যাশবোর্ড থেকে উপরে **Tools** > **Graph API Explorer**-এ যান।
   * ডান পাশে **Meta App** অপশনে আপনার তৈরি করা অ্যাপটি সিলেক্ট করুন।
   * **User or Page** ড্রপডাউন থেকে **User Access Token** সিলেক্ট করুন।
   * **Permissions** সেকশনে নিচের পারমিশনগুলো যুক্ত করুন:
     * `pages_manage_posts`
     * `pages_read_engagement`
   * **Generate Access Token**-এ ক্লিক করুন এবং আপনার ফেসবুক অ্যাকাউন্ট দিয়ে পারমিশন অ্যাপ্রুভ করুন।
   * এবার **User or Page** ড্রপডাউন থেকে আপনার **Fatakesto TV** ফেসবুক পেজটি সিলেক্ট করুন। (এটি করার ফলে এটি একটি Page Access Token-এ রূপান্তরিত হবে)।
   * টোকেনটি কপি করুন।

3. **টোকেনটিকে লং-লিভড (Long-lived / Never Expired) করুন:**
   * সাধারণ টোকেন কয়েক ঘণ্টা পর নষ্ট হয়ে যায়। তাই এটিকে স্থায়ী করার জন্য **Access Token Tool** ব্যবহার করুন:
   * [Access Token Tool Link](https://developers.facebook.com/tools/accesstoken/)
   * সেখানে আপনার পেজের টোকেনের পাশে থাকা **Debug** লিঙ্কে ক্লিক করুন।
   * নিচে **Extend Access Token** অপশন দেখতে পাবেন, সেখানে ক্লিক করে আপনার টোকেনটি সংগ্রহ করুন। পেজ এক্সেস টোকেন সাধারণত কখনও এক্সপায়ার (Expire) হয় না।

---

## ৩. Vercel-এ এনভায়রনমেন্ট ভেরিয়েবল (Environment Variables) যুক্ত করা

এই সিস্টেমটি নিরাপদে চালানোর জন্য আপনার Vercel প্রজেক্টে ডেটাবেজ এবং ফেসবুকের তথ্যগুলো যুক্ত করতে হবে:

1. আপনার [Vercel Dashboard](https://vercel.com)-এ গিয়ে আপনার প্রজেক্টটি ওপেন করুন।
2. **Settings** ট্যাবে যান এবং বাম দিকের মেনু থেকে **Environment Variables** সিলেক্ট করুন।
3. নিচে একে একে এই ৫টি ভেরিয়েবল যুক্ত করুন (Key এবং Value হিসেবে):

| Key (নাম) | Value (মান) | বিবরণ |
| :--- | :--- | :--- |
| `SUPABASE_URL` | আপনার Supabase প্রজেক্ট URL | Supabase API Settings থেকে পাওয়া URL |
| `SUPABASE_SERVICE_ROLE_KEY` | আপনার Supabase `service_role` কী | Supabase API Settings থেকে পাওয়া গোপন কী |
| `ADMIN_PASSWORD` | আপনার পছন্দমতো যেকোনো পাসওয়ার্ড | আপনার এডমিন প্যানেল ([admin.html](file:///f:/FB%20page/Fatakesto%20TV/idex/admin.html)) লগইন করার জন্য |
| `FB_PAGE_ID` | আপনার ফেসবুক পেজের আইডি | আপনার পেজের "About" সেকশন থেকে কপি করুন |
| `FB_PAGE_ACCESS_TOKEN` | আপনার ফেসবুক পেজ এক্সেস টোকেন | ২য় ধাপে জেনারেট করা লং-লিভড পেজ টোকেন |

ভেরিয়েবলগুলো অ্যাড করার পর আপনার প্রজেক্টটি একবার **Redeploy** করুন। ব্যাস! আপনার সম্পূর্ণ সিস্টেমটি এখন অটোমেটিকভাবে কাজ করার জন্য রেডি!
