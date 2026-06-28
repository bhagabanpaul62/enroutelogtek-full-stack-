import crypto from 'crypto'

export const generateEnrouteId = (companyType) => {
    const prefix = {
        customer: 'CUS',
        transporter: 'TRN',
        broker: 'BRK',
        fleetOwner: 'FLT',
    };

    if (companyType === 'transporter'){
        const id = `${prefix.transporter}${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        return id;
    }
    else if(companyType === 'customer'){
        const id = `${prefix.customer}${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        return id;
    }
    else if(companyType === 'broker'){
        const id = `${prefix.broker}${crypto.randomUUID().slice(0, 8).toUpperCase()}`;  
        return id;
    }
    else if(companyType === 'fleetOwner'){
        const id = `${prefix.fleetOwner}${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        return id;
    }
    else{
        throw new Error('Invalid company type');        
    }   
    

};