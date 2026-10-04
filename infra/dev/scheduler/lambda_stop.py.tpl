import boto3
import json

ec2_client = boto3.client('ec2')
rds_client = boto3.client('rds')

EC2_INSTANCE_IDS = json.loads('${ec2_instance_ids}')
RDS_INSTANCE_ID = '${rds_instance_id}'


def lambda_handler(event, context):
    print(f"Stopping EC2 instances: {EC2_INSTANCE_IDS}")
    print(f"Stopping RDS instance: {RDS_INSTANCE_ID}")

    # Stop EC2s
    if EC2_INSTANCE_IDS:
        ec2_client.stop_instances(InstanceIds=EC2_INSTANCE_IDS)
        print(f"EC2 stop command sent for: {EC2_INSTANCE_IDS}")

    # Stop RDS
    if RDS_INSTANCE_ID:
        try:
            rds_client.stop_db_instance(DBInstanceIdentifier=RDS_INSTANCE_ID)
            print(f"RDS stop command sent for: {RDS_INSTANCE_ID}")
        except rds_client.exceptions.InvalidDBInstanceStateFault:
            print(f"RDS {RDS_INSTANCE_ID} already stopped or in transition")

    return {
        'statusCode': 200,
        'body': 'Stop command executed successfully'
    }
