<?php namespace App\Models;

use CodeIgniter\Model;

class Payment_reminders_model extends Base_model
{
    protected $table         = 'payment_reminders';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Payment_reminders';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['payment_id','user_id','reminder_type','sent_at'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'payment_id' => 'required',
        'user_id' => 'required',
        'reminder_type' => 'required',
        'sent_at' => 'required'
    ];
    

}
