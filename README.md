# HydroBackend

Hello everyone, this is group C23-PS440 HydroBackend Section
How to use our backend? 
- Clone this project to your local
- Unzip this zipped file and then after unzipped this file, open it with your lovely code editor
- Do ```npm install```, to install all packages that's needed

After you have done the ```npm install``` , the package is all downloaded to your directory.
Create a dotenv (.env) file in your directory and insert your:
- REFRESH_TOKEN_SECRET
- ACCESS_TOKEN_SECRET
- HOST
- DB_PASSWORD
- DB_PORT
- SERVICE_ACCOUNT

For REFRESH_TOKEN_SECRET and ACCESS_TOKEN_SECRET please put your secret token here and make it secret, because it'll be used on your JWT Token Authentication,
For HOST, it's the value of Public IP Address in my Cloud SQL, you can put your HOST using localhost or using the Cloud SQL one
For DB_PASSWORD, it's the value of your Database Password, if you're developing in local, then put your local db password , but if you are working on a Cloud SQL or other Cloud Services such as Azure, AWS, and GCP. Please make sure to put into your DB_PASSWORD
For DB_PORT, use the 3306 for default MySQL Port
For SERVICE_ACCOUNT, please use your Service Account in your Cloud Provider, in my case I used my GCP Cloud Storage Bucket and create service-account.json, and then I put it in my code

After everything has been setted up, you can use the , docker build, docker run, add it to the Container Artifact Registry, and run it on the Cloud Services that you loved, for me I use Cloud Run for deploying my backend.
