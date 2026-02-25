import irsdk
import time

ir = irsdk.IRSDK()

if ir.startup():
    print("Connected!")
    print("Dumping available variables...")
    
    # Get all var headers
    headers = ir.var_headers_names
    
    # Write all headers to a file
    with open('all_vars.txt', 'w') as f:
        for h in headers:
            f.write(h + '\n')
            
    print("Dumped all variables to all_vars.txt")

        
else:
    print("Could not connect to iRacing.")
