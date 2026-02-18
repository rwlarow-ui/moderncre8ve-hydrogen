# Homepage Build Guide — Weaverse Studio

Step-by-step instructions for building the ModernCre8ve homepage in Weaverse Studio.
Reference JSON: `weaverse-pages/homepage.json`

---

## Step 1: Slideshow (Hero)

**Add section** → search **"Slideshow"**

### Section Settings
- Height: **Full**
- Effect: **Fade**
- Auto rotate: **On**
- Loop: **On**
- Show arrows: **On**
- Show dots: **On**

### Slide 1
- Heading: `Handcrafted Modern Furniture`
- Subheading: `Made by Amish Artisans in Ohio`
- Paragraph: `Solid hardwood furniture designed for modern living — built one piece at a time in Ohio.`
- Button text: `Shop Collections`
- Button link: `/collections`
- Enable overlay: **On**, Opacity: **40**

### Slide 2
- Heading: `Mid-Century Modern Dining`
- Subheading: `Solid Hardwood. Built to Last.`
- Paragraph: `Gather around a table built to last for generations — handcrafted from domestic hardwoods.`
- Button text: `Explore Dining`
- Button link: `/collections/dining`
- Enable overlay: **On**, Opacity: **40**

### Slide 3
- Heading: `Scandinavian & Japandi Design`
- Subheading: `Where Simplicity Meets Craftsmanship`
- Paragraph: `Clean lines, natural materials, and timeless design — furniture that brings calm to every room.`
- Button text: `View Collection`
- Button link: `/collections/scandinavian-design-furniture`
- Enable overlay: **On**, Opacity: **40**

> Assign lifestyle/product background images to each slide from Shopify media library.

---

## Step 2: Highlights

**Add section** → search **"Highlights"**

### Section Settings
- Alignment: **Center**
- Background color: `#FFFFFF`

### Badge 1
- Icon type: **Circle**
- Heading: `Handcrafted in Ohio`
- Content: `Every piece built by skilled Amish artisans using time-honored techniques.`
- Text color: `#29231E`

### Badge 2
- Icon type: **Square**
- Heading: `Solid Hardwood`
- Content: `Domestic-sourced lumber, built to last for generations.`
- Text color: `#29231E`

### Badge 3
- Icon type: **Triangle**
- Heading: `Custom Orders`
- Content: `Personalize any piece to fit your space — choose your wood, finish, and dimensions.`
- Text color: `#29231E`

---

## Step 3: Featured Products

**Add section** → search **"Featured Products"**

### Content Block
- Display mode: **Vertical**
- Content position: **Center center**
- Heading: `Best Sellers`
- Paragraph: `Handcrafted with care, these are our most loved pieces — built to last for generations.`
- Button text: `SHOP ALL`
- Button link: `/collections/best-sellers`

### Products Items Block
- Layout: **Carousel**
- Slides per view: **4**
- Products to show: **8**

---

## Step 4: Collection List (Shop by Category)

**Add section** → search **"Featured Collection"** (type: `feature-collection`)

### Content Block
- Display mode: **Vertical**
- Content position: **Center center**
- Heading: `Shop by Category`
- Paragraph: `From dining tables to bedroom furniture — explore our handcrafted collections.`
- Button text: `VIEW ALL`
- Button link: `/collections`

### Collection Items Block
- Layout: **Grid**
- Gap: **20**

---

## Step 5: Image with Text (Our Story)

**Add section** → search **"Image with Text"**

### Section Settings
- Vertical padding: **None**
- Background color: `#F0F0EF`
- Background for: **Content**

### Images Block (left side)
- Image aspect ratio: **3/4**
- Object fit: **Cover**
- Border radius: **0**
- Upload or select a workshop/artisan photo from Shopify media

### Content Block (right side)
- Gap: **5**
- Content position: **Center center**

**Child 1 — Subheading:**
- Content: `Our Story`

**Child 2 — Heading:**
- Content: `Where Heritage Meets Modern Design`
- Tag: **H2**

**Child 3 — Paragraph:**
- Content: `Founded in Cleveland, Ohio in 2013, ModernCre8ve marries modern design with the world-class execution of old-world Amish craftsmen. Every piece is handmade one at a time using domestic-sourced hardwood lumber.`

**Child 4 — Button:**
- Text: `Learn More`
- Link: `/pages/about-us`
- Variant: **Primary**

---

## Step 6: Video Embed

**Add section** → search **"Video Embed"**

### Content Block
- Display mode: **Vertical**
- Content position: **Center center**
- Heading: `See Our Workshop`
- Paragraph: `Step inside our Cleveland studio and see how every piece of ModernCre8ve furniture comes to life.`

### Video Item Block
- Size: **Large**
- Border radius: **0**
- Paste YouTube/Vimeo workshop video URL

---

## Step 7: Testimonials

**Add section** → search **"Testimonial"**

3 testimonial items total. Each has a content child and a hotspot child.

### Testimonial 1
- Title: `Stunning Craftsmanship`
- Description: `The quality of the craftsmanship is immediately evident. Every piece feels substantial and well-made. I couldn't be happier with my walnut dining table!`
- Rating: **5**
- Author: `John D.`
- Hotspot aspect ratio: **1/1**

### Testimonial 2
- Title: `Beautiful and Functional`
- Description: `Our new coffee table is both a statement piece and incredibly functional. It has quickly become the centerpiece of our living room.`
- Rating: **5**
- Author: `Susan M.`
- Hotspot aspect ratio: **1/1**

### Testimonial 3
- Title: `Perfect Blend of Style and Durability`
- Description: `I was looking for something modern yet durable, and Moderncre8ve delivered beyond my expectations. My new bed frame is a dream!`
- Rating: **5**
- Author: `Alex P.`
- Hotspot aspect ratio: **1/1**

---

## Step 8: Newsletter

**Add section** → search **"Newsletter"**

**Heading:**
- Content: `Join the ModernCre8ve Family`
- Tag: **H2**

**Paragraph:**
- Content: `Be the first to know about new designs, exclusive offers, and behind-the-scenes looks at our workshop.`

**Newsletter Form:**
- Width: **400**
- Placeholder: `Enter your email`
- Button text: `Subscribe`

---

## Post-Build Checklist

- [ ] Save and publish in Weaverse Studio
- [ ] Assign lifestyle images to slideshow slides
- [ ] Assign product/lifestyle images to testimonial hotspots
- [ ] Upload workshop photo for Image with Text section
- [ ] Add workshop video URL to Video Embed
- [ ] Apply brand colors in Theme Settings:
  - Dark Charcoal: `#323640` (primary dark / text)
  - Emerald Green: `#2CBF96` (accent / CTA)
  - Warm Cream: `#F2EBD5` (background / neutral)
  - Amber Gold: `#F2AC29` (highlight / secondary accent)
  - Coral Red: `#D35055` (alert / accent)
  - Cool Gray: `#9DA0A7` (muted / borders)
