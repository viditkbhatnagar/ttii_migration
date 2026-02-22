<form action="<?=base_url('app/students/finance_add/'.$student_id)?>" method="post">
    <div class="row">
        <div class="col-12 col-md-6 form-group p-2">
            <label for="tuition_fees" class="form-label">Tuition Fees<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" id="tuition_fees" name="tuition_fees" placeholder="Enter tuition fees" required>
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="exam_fees" class="form-label">Exam Fees<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" id="exam_fees" name="exam_fees" placeholder="Enter exam fees" required>
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="miscellaneous_fees" class="form-label">Miscellaneous Fees</label>
            <input type="number" class="form-control" id="miscellaneous_fees" name="miscellaneous_fees" placeholder="Enter miscellaneous fees">
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="scholarship_details" class="form-label">Scholarship/Financial Aid Details</label>
            <textarea class="form-control" id="scholarship_details" name="scholarship_details" placeholder="Enter scholarship or financial aid details"></textarea>
        </div>

        <div class="col-12 col-md-6 form-group p-2">
            <label for="amounpayment_status_paid" class="form-label">Payment Status<span class="required text-danger">*</span></label>
            <select class="form-control" id="payment_status" name="payment_status" required>
                <option value="">Choose payment status</option>
                <option value="paid">Paid</option>
                <option value="due">Due</option>
                <option value="overdue">Overdue</option>
            </select>
        </div>
        
        <!-- Submit Button -->
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>
