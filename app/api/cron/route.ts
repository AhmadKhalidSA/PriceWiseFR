import { NextResponse } from "next/server";

import { getLowestPrice, getHighestPrice, getAveragePrice, getEmailNotifType } from "@/lib/utils";
import { connectToDB } from "@/lib/mongoose";
import Product from "@/lib/models/product.model";
import { scrapedAmazonProduct } from "@/lib/scraper";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";

export const maxDuration = 300;
export const dynamic = 'force-dynamic'
export const revalidate = 0;

export async function GET() {
    try {
        connectToDB();

        const products = await Product.find({});
        if(!products) throw new Error("No products found");

        const updatedProducts = await Promise.all(
            products.map(async(currentProduct) => {
                const scrapedProduct = await scrapedAmazonProduct(currentProduct.url);

                if(!scrapedProduct) throw new Error("No product found");

                const updatedPriceHistory = [
                    ...currentProduct.priceHistory,
                    { price: scrapedProduct.currentPrice }
                  ]
            
                  const product = {
                    ...scrapedProduct,
                    priceHistory: updatedPriceHistory,
                    lowestPrice: getLowestPrice(updatedPriceHistory),
                    highestPrice: getHighestPrice(updatedPriceHistory),
                    averagePrice: getAveragePrice(updatedPriceHistory),
                  }
                
            
                    const updatedProduct = await Product.findOneAndUpdate(
                    { url: product.url },
                    product,
                    );

                    // 2. check each products status & send email accordinhly

                    const emailNofiType = getEmailNotifType(scrapedProduct, currentProduct)
                    
                    if(emailNofiType && updatedProduct.users.length > 0) {
                        const productInfo = {
                            title: updatedProduct.title,
                            url: updatedProduct.url,
                        }
                        const  emailContent = await generateEmailBody(productInfo, emailNofiType);


                        const userEmails = updatedProduct.users.map((user: any) => user.email)

                        await sendEmail(emailContent,userEmails);
                    }

                    return updatedProduct;
            })
        )
        
      return NextResponse.json({
        message: 'ok', data: updatedProducts
      })
    } catch (error) {
        throw new Error(`Error in GET: ${error}`)
    }
}