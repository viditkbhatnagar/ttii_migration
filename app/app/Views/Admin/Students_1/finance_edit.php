<?php
if(isset($edit_data) && !empty($edit_data))
{   ?>
    <form action="<?=base_url('app/students/finance_edit/'.$student_id)?>" method="post">
        <div class="row">
            <div class="col-12 col-md-6 form-group p-2">
                <label for="tuition_fees" class="form-label">Tuition Fees<span class="required text-danger">*</span></label>
                <input type="number" class="form-control" id="tuition_fees" name="tuition_fees" placeholder="Enter tuition fees" required value="<?= $edit_data['tuitionFees'] ?>">
            </div>
            
            <div class="col-12 col-md-6 form-group p-2">
                <label for="exam_fees" class="form-label">Exam Fees<span class="required text-danger">*</span></label>
                <input type="number" class="form-control" id="exam_fees" name="exam_fees" placeholder="Enter exam fees" required value="<?= $edit_data['examFees'] ?>">
            </div>
            
            <div class="col-12 col-md-6 form-group p-2">
                <label for="miscellaneous_fees" class="form-label">Miscellaneous Fees</label>
                <input type="number" class="form-control" id="miscellaneous_fees" name="miscellaneous_fees" placeholder="Enter miscellaneous fees" value="<?= $edit_data['miscFees'] ?>">
            </div>
            
            <div class="col-12 col-md-6 form-group p-2">
                <label for="scholarship_details" class="form-label">Scholarship/Financial Aid Details</label>
                <textarea class="form-control" id="scholarship_details" name="scholarship_details" placeholder="Enter scholarship or financial aid details"><?= $edit_data['scholarship_details'] ?></textarea>
            </div>

            <div class="col-12 col-md-6 form-group p-2">
                <label for="amounpayment_status_paid" class="form-label">Payment Status<span class="required text-danger">*</span></label>
                <select class="form-control" id="payment_status" name="payment_status" required>
                    <option value="">Choose payment status</option>
                    <option value="paid" <?= $edit_data['payment_status'] == 'paid' ? 'selected' : '' ?>>Paid</option>
                    <option value="due" <?= $edit_data['payment_status'] == 'due' ? 'selected' : '' ?>>Due</option>
                    <option value="overdue" <?= $edit_data['payment_status'] == 'overdue' ? 'selected' : '' ?>>Overdue</option>
                </select>
            </div>
            
            <!-- Submit Button -->
            <div class="col-12 p-2">
                <button class="btn btn-success float-end btn-save" type="submit">
                    <i class="ri-check-fill"></i> Update
                </button>
            </div>
        </div>
    </form>
<?php } else { ?>
    <h5 class="text-warning text-center">Finance not added yet</h5>
<?php } ?>
