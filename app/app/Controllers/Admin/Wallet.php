<?php
namespace App\Controllers\Admin;

use App\Models\Centres_model;
use App\Models\Wallet_transactions_model;

class Wallet extends AppBaseController
{
    private $centres_model;

    public function __construct()
    {
        parent::__construct();
        $this->centres_model = new Centres_model();
        $this->wallet_transactions_model = new Wallet_transactions_model();
    }

    public function index(){

        $filter_where =[];
        if ($this->request->getGet('centre_id')) 
        {
            $filter_where['centre_id'] = $this->request->getGet('centre_id');
        }
        if ($this->request->getGet('centre_name')) 
        {
            $filter_where['centre_name'] = $this->request->getGet('centre_name');
        }
        
        $this->data['list_items'] = $this->centres_model->get($filter_where)->getResultArray();
        $this->data['page_title'] = 'Wallet';

        $this->data['page_name'] = 'Wallet/index';
        return view('Admin/index', $this->data);
    }

    public function get_transactions($centre_id)
    {
        $filter_where = ['centre_id' => $centre_id];

        // Get transaction type filter from GET param if provided
        $type = $this->request->getGet('type');
        if (!empty($type)) {
            $filter_where['transaction_type'] = $type;
        }

        // Fetch transactions
        $transactions = $this->wallet_transactions_model->get($filter_where)->getResultArray(); // use findAll for clarity

        $this->data['selected_type'] = $type ?? 'all';
        $this->data['transactions'] = $transactions;

        $this->data['page_title'] = 'Wallet Transactions';
        $this->data['page_name'] = 'Wallet/transaction';
        return view('Admin/index', $this->data);
    }


}
