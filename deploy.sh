sam_stack_name=focusmark-"$deployed_environment"-sam-api-workbook
sam_template_file='template.yaml'
cf_stack_name=focusmark-"$deployed_environment"-cf-api-workbook-domainmapping
cf_template_file='domain-mapping.yaml'

npm install lambda --prefix lambda

sam deploy \
  --template-file $sam_template_file \
  --stack-name $sam_stack_name \
  --parameter-overrides TargetEnvironment=$deployed_environment \
  --s3-bucket aws-sam-cli-managed-default-samclisourcebucket-k4b4a4cnewcr \
  --s3-prefix focusmark-$deployed_environment-sam-api-workbook \
  --capabilities CAPABILITY_NAMED_IAM
  
aws cloudformation deploy \
  --template-file $cf_template_file \
  --stack-name $cf_stack_name \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides TargetEnvironment=$deployed_environment