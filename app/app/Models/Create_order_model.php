<?php namespace App\Models;

use CodeIgniter\Model;

use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

use App\Models\Users_model;
use App\Models\Course_model;
use App\Models\Package_model;

class Create_order_model extends Base_model
{
    protected $table         = 'create_order';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Create_order';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];  
    

}
