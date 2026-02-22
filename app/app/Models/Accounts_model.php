<?php namespace App\Models;

use CodeIgniter\Model;

use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Package_model;

class Accounts_model extends Base_model
{
    protected $table         = 'accounts';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Accounts';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];  
    
    
    public function get_primary_account_id()
    {
        $account = $this->where('is_primary', 1)->getRow();
        return $account->id;
    }
     
    

}
