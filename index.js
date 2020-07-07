// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
// WooCommerce rest-api
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const axios = require('axios');

const wcApi = new WooCommerceRestApi({
  url: 'https://staging.humai.club',
  consumerKey: 'YOUR-KEY-HERE',
  consumerSecret: 'YOUR-SECRET-HERE',
  version: 'wc/v1'
});

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  //simple function to search in a string
  function search(what, where)
  {
    what = what.toLowerCase();
    where = where.toLowerCase();
    if (where.indexOf(what)==-1)
      return false;
    else
      return true;
  }
  
  // function to execute after pages and posts are loaded from WP
  function wpLoaded(agent, posts, pages, keywordToSearch)
  {

    var output = "Posts found about '"+keywordToSearch+"': ";
    if (posts.length<1)
    {
      output += " posts not found ";
    }
    else
    {
      for (var postNumber in posts)
      {
        var post = posts[postNumber];
        output += '[' + post.title.rendered + " - " + post.excerpt.rendered+"]";
      }
    }
      
    output += " // Pages found about '"+keywordToSearch +"': ";
    
    if (pages.length<1)
    {
    	output += " pages not found ";
    }
    else
    {
      for (var pageNumber in pages)
      {
        var page = pages[pageNumber];
        output += "[" + page.title.rendered + " - " + page.excerpt.rendered + "]";
      }
    }
    
    agent.add(output);
  }
  
  function tellMeAbout(agent)
  {
    // this function will get the posts and pages containing the keyword
	var wordpressApi = 'https://staging.humai.club/wp-json/wp/v2';
    var keywordToSearch = agent.parameters.product; 
    
	// ask for posts and wait
	return axios.get(wordpressApi + '/posts?search='+keywordToSearch).then(response => 
	{		
		var posts = response.data;
  		
      	// ask for pages and wait
      	return axios.get(wordpressApi + '/pages?search='+keywordToSearch).then(response => 
		{
          var pages = response.data;
          
          // this code will run after receiving the response from WP
          return wpLoaded(agent, posts, pages, keywordToSearch);
          
        });
     	
    });
  }
  
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', wpQuestions);`
  // // below to get this function to be run when a Dialogflow intent is matched
  
	
	function wpQuestions(agent) {
     agent.add(`Here's the answer`);
     agent.add(new Card({
         title: `HumAi Club`,
         imageUrl: 'https://humai.club/wp-content/uploads/2020/04/featuredImage_Izzie.png',
         text: `Ai Tools For Humains | Join Now!`,
         buttonText: 'Visit Our Website',
         buttonUrl: 'https://humai.club/'
       })
     );
     agent.add(new Suggestion(`Quick Reply`));
     agent.add(new Suggestion(`Suggestion`));
     agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
   }

	function wpDevelopment(agent)
	{
    
		return wcApi.get("products/143")
			.then((response) => {

          var productDetails = response.data;

          var output = "Product name: " + productDetails.name + " / Description: " + productDetails.description + " / Price: " + productDetails.price;

          agent.add(output);
        })
        .catch((error) => {
          agent.add("error");
        });

    }

  function productSearch(agent)
  {

    // Get the keyword
    var keywordToSearch = agent.parameters.product;
    keywordToSearch = keywordToSearch.toLowerCase();
    
    var outMessages = 
    {
      notFound: 'Products not found.',
      productsFound: 'I found the following products: ',
      buttonText: 'More information'
    };
	
	//	Get all the products in search keyword in title
	return wcApi.get("products").then((response) =>
	{
		var allProducts = response.data;
		var foundProducts = [];
      	var productName;
      
		for (var product in allProducts)
		{
			productName = allProducts[product].name.toLowerCase();
			if (productName.search(keywordToSearch) != -1)
              	foundProducts.push(allProducts[product]);
		}
      
      	if (foundProducts.length < 1)
        {
          	agent.add(outMessages.notFound);
        }
      	else
      	{
          	agent.add(outMessages.productsFound);
          
         	// Products found
            var title;
            var imageUrl;
            var text;
            var buttonText;
            var link;

            for (var foundProduct in foundProducts)
            {    
                title = foundProducts[foundProduct].name;
                imageUrl = foundProducts[foundProduct].images[0].src;
                text = foundProducts[foundProduct].short_description;
                buttonText = outMessages.buttonText;
                link = foundProducts[foundProduct].permalink;

                // product card

                agent.add(new Card({
                    title: title,
                    imageUrl: imageUrl,
                    text: text,
                    buttonText: buttonText,
                    buttonUrl: link
                  })
                );
            } // End For
      	} // End -else
     
    });
    
  }
  
  
  
  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('WordPress CMS Questions', wpQuestions);
  intentMap.set('WordPress Development', wpDevelopment);
  intentMap.set('Product Search', productSearch);
  intentMap.set('Tell me about', tellMeAbout);
    // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});