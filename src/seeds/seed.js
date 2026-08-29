const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const seedDatabase = async () => {
  try {
    // 1. Upsert Admin
    let admin = await User.findOne({ email: "admin@resellhub.com" });
    if (!admin) {
      admin = await User.create({
        name: "Mahfuz Admin",
        email: "admin@resellhub.com",
        password: "Admin@123456",
        role: "admin",
        status: "active",
        location: { city: "Dhaka", country: "Bangladesh" },
        isEmailVerified: true,
        phone: "+8801700000001",
      });
    } else {
      admin.password = "Admin@123456";
      admin.role = "admin";
      admin.status = "active";
      await admin.save();
    }

    // 2. Upsert Seller
    let seller = await User.findOne({ email: "seller@resellhub.com" });
    if (!seller) {
      seller = await User.create({
        name: "Tanvir Ahmed",
        email: "seller@resellhub.com",
        password: "Seller@123456",
        role: "seller",
        status: "active",
        location: { city: "Gulshan, Dhaka", country: "Bangladesh" },
        isEmailVerified: true,
        phone: "+8801700000002",
        rating: { average: 4.9, count: 24 },
        totalSales: 24,
      });
    } else {
      seller.password = "Seller@123456";
      seller.role = "seller";
      seller.status = "active";
      await seller.save();
    }

    // 3. Upsert Buyer
    let buyer = await User.findOne({ email: "buyer@resellhub.com" });
    if (!buyer) {
      buyer = await User.create({
        name: "Rahim Chowdhury",
        email: "buyer@resellhub.com",
        password: "Buyer@123456",
        role: "buyer",
        status: "active",
        location: { city: "Chittagong", country: "Bangladesh" },
        isEmailVerified: true,
        phone: "+8801700000003",
        totalPurchases: 8,
      });
    } else {
      buyer.password = "Buyer@123456";
      buyer.role = "buyer";
      buyer.status = "active";
      await buyer.save();
    }

    console.log("✅ Core Users Verified & Updated in MongoDB (Admin, Seller, Buyer)");

    // 4. Ensure 8 Verified Featured Products (Exactly 2 full rows on desktop)
    const featuredProducts = [
      {
        title: "Apple iPhone 15 Pro - 128GB (Natural Titanium)",
        description: "Mint condition, battery health 98%, with original box, cable, and receipt.",
        price: 94000,
        originalPrice: 115000,
        category: "Electronics",
        condition: "Like New",
        stock: 1,
        status: "active",
        location: { city: "Gulshan, Dhaka", country: "Bangladesh" },
        images: [
          {
            url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
            publicId: "seed_iphone15",
            isPrimary: true,
          },
        ],
        sellerInfo: {
          sellerId: seller._id,
          name: seller.name,
          rating: 4.9,
          totalSales: 24,
          location: { city: "Gulshan, Dhaka", country: "Bangladesh" },
        },
        views: 420,
        favoritesCount: 18,
        isFeatured: true,
      },
      {
        title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        description: "Used for 2 months only. Comes with magnetic carry case and all original accessories.",
        price: 28500,
        originalPrice: 36000,
        category: "Electronics",
        condition: "Like New",
        stock: 1,
        status: "active",
        location: { city: "Dhanmondi, Dhaka", country: "Bangladesh" },
        images: [
          {
            url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
            publicId: "seed_sony_wh",
            isPrimary: true,
          },
        ],
        sellerInfo: {
          sellerId: seller._id,
          name: seller.name,
          rating: 4.9,
          totalSales: 24,
          location: { city: "Dhanmondi, Dhaka", country: "Bangladesh" },
        },
        views: 310,
        favoritesCount: 14,
        isFeatured: true,
      },
      {
        title: "Apple MacBook Air M2 16GB / 512GB (Midnight)",
        description: "Flawless condition, 42 battery cycle count, includes original 67W fast charger.",
        price: 105000,
        originalPrice: 135000,
        category: "Electronics",
        condition: "Good",
        stock: 1,
        status: "active",
        location: { city: "Uttara, Dhaka", country: "Bangladesh" },
        images: [
          {
            url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
            publicId: "seed_macbook",
            isPrimary: true,
          },
        ],
        sellerInfo: {
          sellerId: seller._id,
          name: seller.name,
          rating: 4.9,
          totalSales: 24,
          location: { city: "Uttara, Dhaka", country: "Bangladesh" },
        },
        views: 650,
        favoritesCount: 29,
        isFeatured: true,
      },
      {
        title: "Canon EOS R6 Mirrorless Camera (Body Only)",
        description: "Shutter count under 12k. Clean sensor, 2 authentic LP-E6NH batteries included.",
        price: 142000,
        originalPrice: 175000,
        category: "Electronics",
        condition: "Like New",
        stock: 1,
        status: "active",
        location: { city: "Dhanmondi, Dhaka", country: "Bangladesh" },
        images: [
          {
            url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80",
            publicId: "seed_canon_r6",
            isPrimary: true,
          },
        ],
        sellerInfo: {
          sellerId: seller._id,
          name: seller.name,
          rating: 4.9,
          totalSales: 24,
          location: { city: "Dhanmondi, Dhaka", country: "Bangladesh" },
        },
        views: 512,
        favoritesCount: 22,
        isFeatured: true,
      },
      {
        title: "Herman Miller Aeron Ergonomic Chair - Size B",
        description: "Fully loaded with lumbar posture fit, forward tilt, and 3D armrests. Super comfy.",
        price: 58000,
        originalPrice: 85000,
        category: "Furniture",
        condition: "Like New",
        stock: 1,
        status: "active",
        location: { city: "Banani, Dhaka", country: "Bangladesh" },
        images: [
          {
            url: "https://images.unsplash.com/photo-1580481077197-2a5433d7b925?w=600&auto=format&fit=crop&q=80",
            publicId: "seed_aeron_chair",
            isPrimary: true,
          },
        ],
        sellerInfo: {
          sellerId: seller._id,
          name: seller.name,
          rating: 4.9,
          totalSales: 24,
          location: { city: "Banani, Dhaka", country: "Bangladesh" },
        },
        views: 295,
        favoritesCount: 16,
        isFeatured: true,
      },
      {
        title: "Yamaha FZ-S FI Version 3.0 (Matte Black)",
        description: "2023 model, 11,000 km run. Single user, Dhaka Metro digital number plate with tax token.",
        price: 195000,
        originalPrice: 240000,
        category: "Vehicles",
        condition: "Good",
        stock: 1,
        status: "active",
        location: { city: "Mirpur, Dhaka", country: "Bangladesh" },
        images: [
          {
            url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80",
            publicId: "seed_yamaha_fzs",
            isPrimary: true,
          },
        ],
        sellerInfo: {
          sellerId: seller._id,
          name: seller.name,
          rating: 4.9,
          totalSales: 24,
          location: { city: "Mirpur, Dhaka", country: "Bangladesh" },
        },
        views: 890,
        favoritesCount: 45,
        isFeatured: true,
      },
      {
        title: "Apple iPad Air M2 11-inch 128GB + Apple Pencil Pro",
        description: "Space Gray, paper-like screen protector installed on day 1. 100% scratch-free.",
        price: 72000,
        originalPrice: 92000,
        category: "Electronics",
        condition: "Like New",
        stock: 1,
        status: "active",
        location: { city: "Agrabad, Chittagong", country: "Bangladesh" },
        images: [
          {
            url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
            publicId: "seed_ipad_air",
            isPrimary: true,
          },
        ],
        sellerInfo: {
          sellerId: seller._id,
          name: seller.name,
          rating: 4.9,
          totalSales: 24,
          location: { city: "Agrabad, Chittagong", country: "Bangladesh" },
        },
        views: 430,
        favoritesCount: 20,
        isFeatured: true,
      },
      {
        title: "Sony PlayStation 5 Digital Edition (CFI-1200)",
        description: "Comes with 2 DualSense wireless controllers, charging dock, and HDMI 2.1 cable.",
        price: 52000,
        originalPrice: 65000,
        category: "Electronics",
        condition: "Like New",
        stock: 1,
        status: "active",
        location: { city: "Zindabazar, Sylhet", country: "Bangladesh" },
        images: [
          {
            url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80",
            publicId: "seed_ps5_digital",
            isPrimary: true,
          },
        ],
        sellerInfo: {
          sellerId: seller._id,
          name: seller.name,
          rating: 4.9,
          totalSales: 24,
          location: { city: "Zindabazar, Sylhet", country: "Bangladesh" },
        },
        views: 740,
        favoritesCount: 37,
        isFeatured: true,
      },
    ];

    // Remove old seed products and insert the 8 curated featured products
    await Product.deleteMany({ "sellerInfo.sellerId": seller._id });
    const createdProducts = await Product.insertMany(featuredProducts);
    console.log("✅ 8 Verified Featured Products Seeded in MongoDB successfully!");

    // 5. Ensure Initial Orders exist in MongoDB
    const orderCount = await Order.countDocuments();
    if (orderCount === 0 && createdProducts.length >= 3) {
      const Order = require("../models/Order");
      const orders = [
        {
          orderNumber: "ORD-94812",
          productId: createdProducts[0]._id,
          productSnapshot: {
            productId: createdProducts[0]._id.toString(),
            title: createdProducts[0].title,
            price: createdProducts[0].price,
            category: createdProducts[0].category,
            condition: createdProducts[0].condition,
          },
          buyerInfo: {
            userId: buyer._id,
            name: buyer.name,
            email: buyer.email,
            phone: buyer.phone,
          },
          sellerInfo: {
            userId: seller._id,
            name: seller.name,
            email: seller.email,
            phone: seller.phone,
          },
          amount: createdProducts[0].price,
          platformFee: Math.round(createdProducts[0].price * 0.05),
          sellerAmount: Math.round(createdProducts[0].price * 0.95),
          orderStatus: "delivered",
          paymentStatus: "paid",
          paymentMethod: "stripe",
          shippingAddress: {
            fullName: buyer.name,
            phone: buyer.phone || "+8801700000003",
            street: "Road 12, Block D",
            city: "Dhaka",
            postalCode: "1212",
            country: "Bangladesh",
          },
        },
        {
          orderNumber: "ORD-94813",
          productId: createdProducts[1]._id,
          productSnapshot: {
            productId: createdProducts[1]._id.toString(),
            title: createdProducts[1].title,
            price: createdProducts[1].price,
            category: createdProducts[1].category,
            condition: createdProducts[1].condition,
          },
          buyerInfo: {
            userId: buyer._id,
            name: buyer.name,
            email: buyer.email,
            phone: buyer.phone,
          },
          sellerInfo: {
            userId: seller._id,
            name: seller.name,
            email: seller.email,
            phone: seller.phone,
          },
          amount: createdProducts[1].price,
          platformFee: Math.round(createdProducts[1].price * 0.05),
          sellerAmount: Math.round(createdProducts[1].price * 0.95),
          orderStatus: "shipped",
          paymentStatus: "paid",
          paymentMethod: "bkash",
          shippingAddress: {
            fullName: buyer.name,
            phone: buyer.phone || "+8801700000003",
            street: "Agrabad Commercial Area",
            city: "Chittagong",
            postalCode: "4000",
            country: "Bangladesh",
          },
        },
        {
          orderNumber: "ORD-94814",
          productId: createdProducts[2]._id,
          productSnapshot: {
            productId: createdProducts[2]._id.toString(),
            title: createdProducts[2].title,
            price: createdProducts[2].price,
            category: createdProducts[2].category,
            condition: createdProducts[2].condition,
          },
          buyerInfo: {
            userId: buyer._id,
            name: buyer.name,
            email: buyer.email,
            phone: buyer.phone,
          },
          sellerInfo: {
            userId: seller._id,
            name: seller.name,
            email: seller.email,
            phone: seller.phone,
          },
          amount: createdProducts[2].price,
          platformFee: Math.round(createdProducts[2].price * 0.05),
          sellerAmount: Math.round(createdProducts[2].price * 0.95),
          orderStatus: "placed",
          paymentStatus: "pending",
          paymentMethod: "cash",
          shippingAddress: {
            fullName: buyer.name,
            phone: buyer.phone || "+8801700000003",
            street: "Zindabazar Point",
            city: "Sylhet",
            postalCode: "3100",
            country: "Bangladesh",
          },
        },
      ];
      await Order.insertMany(orders);
      console.log("✅ Seed Orders created in MongoDB successfully!");
    }
  } catch (error) {
    console.error("❌ Seeding Error:", error.message);
  }
};

module.exports = { seedDatabase };
