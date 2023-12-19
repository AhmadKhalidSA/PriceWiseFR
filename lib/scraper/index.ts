import axios from 'axios';
import * as cheerio from 'cheerio'
import { extractCurrency, extractDescription, extractPrice } from '../utils';


export async function  scrapedAmazonProduct(url:string) {
    if(!url) return;
    //brightdata proxy config

    
    const username = String(process.env.BRIGHT_DATA_USERNME);
    const password = String(process.env.BRIGHT_DATA_PASSWORD);
    const port = 22225;
    const session_id = (1000000 * Math.random()) | 0;
    
    const options = {
        auth: {
            username: `${username}-session-${session_id}`,
            password,
        },
        host: 'brd.superproxy.io',
        port,
        rejectUnauthorized: false,
    }

    try {
        const response = await axios.get(url, options);
        const $ = cheerio.load(response.data);

        //extract the product title
        const title = $('#productTitle').text().trim();
        const currentPrice = extractPrice(
            $('.priceToPay span.a-price-whole'),
            $('a.size.base.a-color-price'),
            $('.a-button-selected .a-color-base'),
        );

        const originalPrice = extractPrice(
          $('#priceblock_ourprice'),
          $('.a-price.a-text-price span.a-offscreen'),
          $('#listtPrice'),
          $('#priceblock_dealprice'),
          $('a.size-base.a-color-price')
        );

        const outOfStock = $('#availability span').text().trim().toLocaleLowerCase() === 'currently unavailable';
        
        const images = 
        $('#imgBlkFront').attr('data-a-dynamic-image') || 
        $('#landingImage').attr('data-a-dynamic-image') ||
        '{}'

        // const discount1 = originalPrice - currentPrice;

        const imagesUrls = Object.keys(JSON.parse(images));

        const currency = extractCurrency($('.a-price-symbol'));

        const discountRate = $('.savingsPercentage').text().replace(/[-%]/g, "");

        const description = extractDescription($)


        // console.log({title, currentPrice, originalPrice, discountRate , currency ,outOfStock, imagesUrls})

        //constract data object with scraped info

        const data = {
            url,
            currency: currency || '$',
            image: imagesUrls[0],
            title,
            currentPrice: Number(currentPrice) || Number(originalPrice),
            originalPrice: Number(originalPrice) || Number(currentPrice),
            priceHistory: [],
            discountRate: Number(discountRate),
            category: 'category',
            reviewsCount: 100,
            stars: 4.5,
            isOutOfStock: outOfStock, 
            description,
            lowestPrice: Number(currentPrice) || Number(originalPrice),
            highestPrice: Number(originalPrice) || Number(currentPrice),
            averagePrice:Number(currentPrice) || Number(originalPrice),
        }


        // console.log(data);

        return data;
    } catch (error: any) {
        throw new Error('Failed to scrape product: ${error.message}')
    }
}