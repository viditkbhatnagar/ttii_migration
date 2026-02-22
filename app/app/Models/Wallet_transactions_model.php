<?php namespace App\Models;

use CodeIgniter\Model;

class Wallet_transactions_model extends Base_model
{
    protected $table         = 'wallet_transactions';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\wallet_transactions';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
}
