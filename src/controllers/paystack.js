import https from "node:https"

const handlePayment = async (req, res) => {
    // console.log("payment api called");
  
    const { amount,email } = req.body;
    // console.log(email,amount);
    try {
      
          const params = JSON.stringify({
            email: email,
            amount: amount * 100,
            callback_url: "https://farmyapp.com"
          });
  
          const options = {
            hostname: "api.paystack.co",
            port: 443,
            path: "/transaction/initialize",
            method: "POST",
            headers: {
              Authorization: `Bearer sk_test_4dabb4d535f682efa5fcebb236318ca83dc9e7c4`,
              "Content-Type": "application/json",
            },
          };
  
          const reqPaystack = https
            .request(options, (resPaystack) => {
              let data = "";
  
              resPaystack.on("data", (chunk) => {
                data += chunk;
              });
  
              resPaystack.on("end", () => {
                res.send(JSON.parse(data));
              });
            })
            .on("error", (error) => {
              res.send(error);
            });
  
          reqPaystack.write(params);
          reqPaystack.end();
        
      
    } catch (error) {
      console.log(error);
    }
  };
  
  const handleVerifyTransaction = async (req,res)=>{
    // console.log("verification called")
    const {reference} = req.query
  
    // console.log(`/transaction/verify/${reference}`)
  try{
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer sk_test_4dabb4d535f682efa5fcebb236318ca83dc9e7c4`,
      }
    }
    
    const reqPaystack = https.request(options, resPaystack => {
      let data = ''
    
      resPaystack.on('data', (chunk) => {
        data += chunk
      });
    
      resPaystack.on('end', () => {
        // console.log(JSON.parse(data))
        res.send(JSON.parse(data))
      })
    }).on('error', error => {
      console.error(error)
      res.send(error)
    })
    reqPaystack.end();
  }catch(error){
    console.log(error)
  }
  }

export {
    handlePayment,
    handleVerifyTransaction
}